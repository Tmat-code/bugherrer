// Henter kommentarer pr. fejl til eksport-rapporten — UDEN den markerede løsning
// (Zeekr skal ikke have workaround'en, kun selve fejlen). Oversaetter til rapportsproget
// hvis det ikke er dansk. Ét samlet oversaetter-kald for alle kommentarer.

import { queries } from '@/lib/db';
import type { Fejl } from '@/lib/db';
import { oversaetTekster } from '@/lib/oversaet';
import type { RapportSprog } from '@/lib/rapport-i18n';

export interface RapportKommentar {
  navn: string;
  tekst: string;
}

export async function hentKommentarerTilRapport(
  fejl: Pick<Fejl, 'id' | 'loesning_kommentar_id'>[],
  sprog: RapportSprog
): Promise<Record<number, RapportKommentar[]>> {
  // Saml alle kommentarer (minus løsningen) på tværs af fejlene.
  const flad: { fejlId: number; navn: string; tekst: string }[] = [];
  for (const f of fejl) {
    const ks = queries.kommentarerForFejl
      .all(f.id)
      .filter((k) => k.id !== f.loesning_kommentar_id);
    for (const k of ks) flad.push({ fejlId: f.id, navn: k.navn, tekst: k.tekst });
  }

  if (flad.length === 0) return {};

  const oversat = await oversaetTekster(
    flad.map((k) => k.tekst),
    sprog
  );

  const resultat: Record<number, RapportKommentar[]> = {};
  flad.forEach((k, i) => {
    (resultat[k.fejlId] ??= []).push({ navn: k.navn, tekst: oversat[i] ?? k.tekst });
  });
  return resultat;
}
