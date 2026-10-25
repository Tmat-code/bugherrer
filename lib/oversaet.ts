// Oversaetter fejl-tekster (titel + beskrivelse) via LibreTranslate, med cache i databasen.
//
// LibreTranslate er selvhostet (fx paa Pixa via Coolify) — gratis, ingen konto,
// og teksten forlader aldrig serveren.
//
// Graceful: er LIBRETRANSLATE_URL ikke sat, eller er maalsproget dansk, returneres
// den originale danske tekst — alt virker, intet braekker. Fejler kaldet, falder
// vi ogsaa tilbage til dansk frem for at vaelte eksporten.

import crypto from 'node:crypto';
import { queries } from '@/lib/db';
import type { Fejl } from '@/lib/db';
import { MAALSPROG, type RapportSprog } from '@/lib/rapport-i18n';

// Fx http://192.168.1.18:5000 (LAN) eller den interne Docker-adresse i Coolify.
const LT_URL = process.env.LIBRETRANSLATE_URL || '';
// Valgfri — kun hvis din LibreTranslate-instans kraever en API-noegle (LT_API_KEYS).
const LT_KEY = process.env.LIBRETRANSLATE_API_KEY || '';

// 'v2' = cache-version. Bumpes hvis oversaetter-logikken aendres, saa gamle
// (evt. forkerte) cache-entries automatisk bliver ugyldige og hentes friskt.
function hash(s: string): string {
  return crypto.createHash('sha1').update('v2\n' + s).digest('hex');
}

// Ét LibreTranslate-kald (array af strenge). Kaster ved fejl.
async function ltKald(tekster: string[], kilde: string, maal: string): Promise<string[]> {
  const body: Record<string, unknown> = { q: tekster, source: kilde, target: maal, format: 'text' };
  if (LT_KEY) body.api_key = LT_KEY;

  const res = await fetch(`${LT_URL.replace(/\/$/, '')}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // Undgaa at en haengende server blokerer eksporten for evigt.
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`LibreTranslate svarede ${res.status} (${kilde}->${maal})`);
  const data = (await res.json()) as { translatedText: string | string[] };
  // Ved array-input svarer LibreTranslate med et array; ellers en enkelt streng.
  return Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];
}

// Oversaet fra dansk til maalsproget. Der findes ingen direkte da->sv model i
// Argos, saa for alt andet end engelsk pivoterer vi gennem engelsk (da->en->maal).
async function libreOversaet(tekster: string[], maal: string): Promise<string[]> {
  if (maal === 'en') return ltKald(tekster, 'da', 'en');
  const engelsk = await ltKald(tekster, 'da', 'en');
  return ltKald(engelsk, 'en', maal);
}

export interface OversatFejl extends Fejl {
  oversat: boolean; // true hvis titel/beskrivelse faktisk blev oversat
}

// Returnerer fejl-listen med titel + beskrivelse paa oensket sprog.
export async function oversaetFejl(fejl: Fejl[], sprog: RapportSprog): Promise<OversatFejl[]> {
  const maal = MAALSPROG[sprog];

  // Dansk, eller ingen oversaetter konfigureret -> original tekst.
  if (!maal || !LT_URL) {
    return fejl.map((f) => ({ ...f, oversat: false }));
  }

  const resultat: OversatFejl[] = [];
  const atOversaette: string[] = [];
  const uoversatte: { indeks: number; base: number }[] = [];

  // 1) Brug cache hvor kildeteksten er uaendret; saml resten.
  fejl.forEach((f, i) => {
    const kildeHash = hash(`${f.titel}\n${f.beskrivelse}`);
    const cache = queries.hentOversaettelse.get(f.id, sprog);
    if (cache && cache.kilde_hash === kildeHash) {
      resultat[i] = { ...f, titel: cache.titel, beskrivelse: cache.beskrivelse, oversat: true };
    } else {
      resultat[i] = { ...f, oversat: false };
      const base = atOversaette.length;
      atOversaette.push(f.titel, f.beskrivelse);
      uoversatte.push({ indeks: i, base });
    }
  });

  if (atOversaette.length === 0) return resultat;

  // 2) Ét samlet kald for alt der mangler.
  let oversat: string[];
  try {
    oversat = await libreOversaet(atOversaette, maal);
  } catch (e) {
    console.error('[oversaet] LibreTranslate fejlede, falder tilbage til dansk:', e);
    return fejl.map((f, i) => resultat[i] ?? { ...f, oversat: false });
  }

  // 3) Flet oversaettelserne ind + gem i cache.
  for (const { indeks, base } of uoversatte) {
    const f = fejl[indeks];
    const nyTitel = oversat[base] ?? f.titel;
    const nyBesk = oversat[base + 1] ?? f.beskrivelse;
    resultat[indeks] = { ...f, titel: nyTitel, beskrivelse: nyBesk, oversat: true };
    try {
      queries.gemOversaettelse.run({
        fejl_id: f.id,
        sprog,
        kilde_hash: hash(`${f.titel}\n${f.beskrivelse}`),
        titel: nyTitel,
        beskrivelse: nyBesk,
      });
    } catch (e) {
      console.error('[oversaet] kunne ikke cache oversaettelse:', e);
    }
  }

  return resultat;
}
