// Oversaettelser af selve RAPPORTENS tekst (labels, overskrifter, disclaimer, status).
// Selve fejl-teksten (titel + beskrivelse) oversaettes separat i lib/oversaet.ts.
//
// Sprog understoettet i eksporten: dansk (da), engelsk (en), svensk (sv).

import { SITE } from '@/lib/config';
import type { Status } from '@/lib/config';

export const RAPPORT_SPROG = ['da', 'en', 'sv'] as const;
export type RapportSprog = (typeof RAPPORT_SPROG)[number];

export function erGyldigtSprog(s: string | null): RapportSprog {
  return (RAPPORT_SPROG as readonly string[]).includes(s ?? '')
    ? (s as RapportSprog)
    : 'da';
}

// Målsprog-koder til oversætter-API'et (LibreTranslate bruger ISO-koder).
// 'da' bruger ingen oversaettelse (kildesproget).
export const MAALSPROG: Record<RapportSprog, string | null> = {
  da: null,
  en: 'en',
  sv: 'sv',
};

// Locale til datoformatering.
export const DATO_LOCALE: Record<RapportSprog, string> = {
  da: 'da-DK',
  en: 'en-GB',
  sv: 'sv-SE',
};

type Tekster = {
  sprognavn: string; // vist i admin-vaelgeren
  rapportTitel: string;
  undertitel: string; // {domain} indsaettes
  genereret: (dato: string, antal: number) => string;
  intro: string;
  metaLabels: { model: string; software: string; status: string; telefon: string };
  stemme: string;
  stemmer: string;
  sideAf: (n: number, af: number) => string;
  // Eskalerings-markoerer: "NY" for aldrig-sendte, "+N siden sidst" for voksede.
  delta: { ny: string; mere: (n: number) => string };
  csvKolonner: string[];
  disclaimer: string; // {domain} indsaettes
  filnavn: string; // slug i filnavnet
  status: Record<Status, string>;
};

export const I18N: Record<RapportSprog, Tekster> = {
  da: {
    sprognavn: 'Dansk',
    rapportTitel: 'BUGHERRER-RAPPORT',
    undertitel: `Uafhængigt fejl-board for Zeekr 7GT-ejere — ${SITE.domain}`,
    genereret: (dato, antal) => `Genereret ${dato} · Top ${antal} mest bekræftede fejl`,
    intro:
      'Denne rapport samler de softwarefejl ("bugherrer"), som flest ejere i fællesskabet ' +
      'har bekræftet at opleve. Hver post viser antal bekræftelser (stemmer), berørt model, ' +
      'softwareversion samt beskrivelse af, hvordan fejlen genskabes.',
    metaLabels: { model: 'Model', software: 'Software', status: 'Status', telefon: 'Telefon' },
    stemme: 'stemme',
    stemmer: 'stemmer',
    sideAf: (n, af) => `Side ${n} af ${af}`,
    delta: { ny: 'NY', mere: (n) => `+${n} siden sidst` },
    csvKolonner: [
      'Placering',
      'Stemmer',
      'Ændring siden sidst',
      'Titel',
      'Bilmodel',
      'Softwareversion',
      'Telefon',
      'Telefon-OS',
      'Status',
      'Beskrivelse',
      'Oprettet',
    ],
    disclaimer:
      `${SITE.domain} er et 100% uafhængigt, privat initiativ drevet af og for ` +
      `bilentusiaster. Siden er ikke tilknyttet, sponsoreret eller godkendt af ` +
      `ZEEKR Denmark ApS, Geely eller deres datterselskaber.`,
    filnavn: 'rapport-da',
    status: {
      'Undersøges': 'Undersøges',
      'Bekræftet': 'Bekræftet',
      'Sendt til Zeekr': 'Sendt til Zeekr',
      'Løst!': 'Løst!',
    },
  },

  en: {
    sprognavn: 'English',
    rapportTitel: 'BUGHERRER REPORT',
    undertitel: `Independent bug board for Zeekr 7GT owners — ${SITE.domain}`,
    genereret: (dato, antal) => `Generated ${dato} · Top ${antal} most confirmed issues`,
    intro:
      'This report compiles the software issues ("bugs") that the most owners in the ' +
      'community have confirmed experiencing. Each entry shows the number of confirmations ' +
      '(votes), affected model, software version and a description of how to reproduce the issue.',
    metaLabels: { model: 'Model', software: 'Software', status: 'Status', telefon: 'Phone' },
    stemme: 'vote',
    stemmer: 'votes',
    sideAf: (n, af) => `Page ${n} of ${af}`,
    delta: { ny: 'NEW', mere: (n) => `+${n} since last` },
    csvKolonner: [
      'Rank',
      'Votes',
      'Change since last',
      'Title',
      'Car model',
      'Software version',
      'Phone',
      'Phone OS',
      'Status',
      'Description',
      'Created',
    ],
    disclaimer:
      `${SITE.domain} is a 100% independent, private initiative run by and for car ` +
      `enthusiasts. The site is not affiliated with, sponsored by or endorsed by ` +
      `ZEEKR Denmark ApS, Geely or their subsidiaries.`,
    filnavn: 'report-en',
    status: {
      'Undersøges': 'Investigating',
      'Bekræftet': 'Confirmed',
      'Sendt til Zeekr': 'Sent to Zeekr',
      'Løst!': 'Solved!',
    },
  },

  sv: {
    sprognavn: 'Svenska',
    rapportTitel: 'BUGHERRER-RAPPORT',
    undertitel: `Oberoende buggforum för Zeekr 7GT-ägare — ${SITE.domain}`,
    genereret: (dato, antal) => `Genererad ${dato} · Topp ${antal} mest bekräftade fel`,
    intro:
      'Den här rapporten samlar de programvarufel ("buggar") som flest ägare i gemenskapen ' +
      'har bekräftat att de upplever. Varje post visar antal bekräftelser (röster), berörd ' +
      'modell, programvaruversion samt en beskrivning av hur felet återskapas.',
    metaLabels: { model: 'Modell', software: 'Programvara', status: 'Status', telefon: 'Telefon' },
    stemme: 'röst',
    stemmer: 'röster',
    sideAf: (n, af) => `Sida ${n} av ${af}`,
    delta: { ny: 'NY', mere: (n) => `+${n} sedan sist` },
    csvKolonner: [
      'Placering',
      'Röster',
      'Förändring sedan sist',
      'Titel',
      'Bilmodell',
      'Programvaruversion',
      'Telefon',
      'Telefon-OS',
      'Status',
      'Beskrivning',
      'Skapad',
    ],
    disclaimer:
      `${SITE.domain} är ett 100% oberoende, privat initiativ som drivs av och för ` +
      `bilentusiaster. Sidan är inte knuten till, sponsrad av eller godkänd av ` +
      `ZEEKR Denmark ApS, Geely eller deras dotterbolag.`,
    filnavn: 'rapport-sv',
    status: {
      'Undersøges': 'Utreds',
      'Bekræftet': 'Bekräftad',
      'Sendt til Zeekr': 'Skickad till Zeekr',
      'Løst!': 'Löst!',
    },
  },
};

// Oversaet en status-vaerdi. Ukendte statusser gives uaendret tilbage.
export function oversaetStatus(status: string, sprog: RapportSprog): string {
  const map = I18N[sprog].status as Record<string, string>;
  return map[status] ?? status;
}

// Eskalerings-tekst for en fejl i rapporten:
//  - aldrig sendt foer  -> "NY"
//  - vokset siden sidst -> "+N siden sidst"
//  - sendt, men uaendret -> tom streng
export function deltaTekst(
  f: {
    stemmer: number;
    sidst_sendt_stemmer: number | null;
    sidst_sendt_dato: string | null;
  },
  sprog: RapportSprog
): string {
  if (!f.sidst_sendt_dato) return I18N[sprog].delta.ny;
  const vaekst = f.stemmer - (f.sidst_sendt_stemmer ?? 0);
  return vaekst > 0 ? I18N[sprog].delta.mere(vaekst) : '';
}
