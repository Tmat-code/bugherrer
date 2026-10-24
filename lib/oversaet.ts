// Oversaetter fejl-tekster (titel + beskrivelse) via DeepL, med cache i databasen.
//
// Graceful: er der ingen DEEPL_API_KEY, eller er maalsproget dansk, returneres
// den originale danske tekst — alt virker, intet braekker. Fejler DeepL-kaldet,
// falder vi ogsaa tilbage til dansk frem for at vaelte eksporten.

import crypto from 'node:crypto';
import { queries } from '@/lib/db';
import type { Fejl } from '@/lib/db';
import { DEEPL_MAALSPROG, type RapportSprog } from '@/lib/rapport-i18n';

// DeepL Free som standard. Pro-brugere kan overstyre via DEEPL_API_URL
// (https://api.deepl.com/v2/translate).
const DEEPL_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate';

function hash(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

// Oversaet et array af strenge via DeepL i ét samlet kald. Kaster ved fejl.
async function deeplOversaet(tekster: string[], maal: string, noegle: string): Promise<string[]> {
  const body = new URLSearchParams();
  body.set('target_lang', maal);
  body.set('source_lang', 'DA');
  for (const t of tekster) body.append('text', t);

  const res = await fetch(DEEPL_URL, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${noegle}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    // Undgaa at en haengende DeepL blokerer eksporten for evigt.
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`DeepL svarede ${res.status}`);
  const data = (await res.json()) as { translations: { text: string }[] };
  return data.translations.map((t) => t.text);
}

export interface OversatFejl extends Fejl {
  oversat: boolean; // true hvis titel/beskrivelse faktisk blev oversat
}

// Returnerer fejl-listen med titel + beskrivelse paa oensket sprog.
export async function oversaetFejl(fejl: Fejl[], sprog: RapportSprog): Promise<OversatFejl[]> {
  const maal = DEEPL_MAALSPROG[sprog];
  const noegle = process.env.DEEPL_API_KEY;

  // Dansk, eller ingen noegle -> original tekst.
  if (!maal || !noegle) {
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

  // 2) Ét samlet DeepL-kald for alt der mangler.
  let oversat: string[];
  try {
    oversat = await deeplOversaet(atOversaette, maal, noegle);
  } catch (e) {
    console.error('[oversaet] DeepL fejlede, falder tilbage til dansk:', e);
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
