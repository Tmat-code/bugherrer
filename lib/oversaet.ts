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
    // Undgaa at en haengende server blokerer eksporten for evigt. Klumperne er smaa,
    // saa 30s er rigeligt — ogsaa hvis modellen lige skal varmes op paa foerste kald.
    signal: AbortSignal.timeout(30000),
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
  const mangler: number[] = [];

  // 1) Brug cache hvor kildeteksten er uaendret; saml resten.
  fejl.forEach((f, i) => {
    const kildeHash = hash(`${f.titel}\n${f.beskrivelse}`);
    const cache = queries.hentOversaettelse.get(f.id, sprog);
    if (cache && cache.kilde_hash === kildeHash) {
      resultat[i] = { ...f, titel: cache.titel, beskrivelse: cache.beskrivelse, oversat: true };
    } else {
      resultat[i] = { ...f, oversat: false };
      mangler.push(i);
    }
  });

  if (mangler.length === 0) return resultat;

  // 2) Oversaet de manglende i SMAA klumper (5 fejl = 10 strenge ad gangen) frem for ét
  //    kaempe kald. Et stort/koldt kald paa alle 40+ strenge kan time ud og vaelte HELE
  //    rapporten til dansk; smaa klumper er hurtige. Hver klump der lykkes caches med det
  //    samme (progressivt — naeste eksport henter resten), og en klump der fejler beholder
  //    bare dansk for netop de fejl i stedet for at smitte af paa resten.
  const KLUMP = 5;
  for (let start = 0; start < mangler.length; start += KLUMP) {
    const gruppe = mangler.slice(start, start + KLUMP);
    const tekster: string[] = [];
    gruppe.forEach((i) => tekster.push(fejl[i].titel, fejl[i].beskrivelse));

    let oversat: string[];
    try {
      oversat = await libreOversaet(tekster, maal);
    } catch (e) {
      console.error('[oversaet] klump fejlede, beholder dansk for den:', e);
      continue; // resultat[i] er allerede sat til dansk (oversat:false)
    }

    gruppe.forEach((i, j) => {
      const f = fejl[i];
      const nyTitel = oversat[j * 2] ?? f.titel;
      const nyBesk = oversat[j * 2 + 1] ?? f.beskrivelse;
      resultat[i] = { ...f, titel: nyTitel, beskrivelse: nyBesk, oversat: true };
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
    });
  }

  return resultat;
}

export interface OversaetStatus {
  konfigureret: boolean; // er LIBRETRANSLATE_URL sat?
  vaert: string | null; // host:port (uden sti) — til visning
  ok: boolean; // svarede et live da->en kald korrekt?
  prove?: { kilde: string; resultat: string };
  fejl?: string;
}

// Live-diagnose af oversaettelsen: er LibreTranslate sat op, kan vi naa den, og
// oversaetter den rent faktisk? Bruges af admin-knappen "Test oversaettelse".
export async function oversaetDiagnose(): Promise<OversaetStatus> {
  if (!LT_URL) return { konfigureret: false, vaert: null, ok: false };
  let vaert = LT_URL;
  try {
    vaert = new URL(LT_URL).host;
  } catch {
    /* behold raa vaerdi */
  }
  const kilde = 'Bilen bremser pludseligt i bakgear.';
  try {
    const [resultat] = await libreOversaet([kilde], 'en');
    return { konfigureret: true, vaert, ok: true, prove: { kilde, resultat } };
  } catch (e) {
    return { konfigureret: true, vaert, ok: false, fejl: e instanceof Error ? e.message : String(e) };
  }
}

// Oversaetter en simpel liste af tekster (fx kommentarer) til rapportsproget.
// Ingen DB-cache — bruges sjaeldent (kun ved eksport med kommentarer slaaet til).
// Graceful: dansk/ingen oversaetter, eller fejl → original tekst tilbage.
export async function oversaetTekster(
  tekster: string[],
  sprog: RapportSprog
): Promise<string[]> {
  const maal = MAALSPROG[sprog];
  if (!maal || !LT_URL || tekster.length === 0) return tekster;
  try {
    return await libreOversaet(tekster, maal);
  } catch (e) {
    console.error('[oversaet] kunne ikke oversaette kommentarer:', e);
    return tekster;
  }
}
