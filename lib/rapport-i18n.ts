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
  metaLabels: {
    model: string;
    software: string;
    status: string;
    telefon: string;
    bilBekraeftet: string;
  };
  stemme: string;
  stemmer: string;
  svar: string; // "svar"/"replies" til antal-svar-linjen
  kommentarerOverskrift: string; // overskrift over kommentar-listen i PDF
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
    genereret: (dato, antal) => `Genereret ${dato} · ${antal} poster`,
    intro:
      'Denne rapport samler de softwarefejl ("bugherrer"), som flest ejere i fællesskabet ' +
      'har bekræftet at opleve. Hver post viser antal bekræftelser (stemmer), berørt model, ' +
      'softwareversion samt beskrivelse af, hvordan fejlen genskabes.',
    metaLabels: {
      model: 'Model',
      software: 'Software',
      status: 'Status',
      telefon: 'Telefon',
      bilBekraeftet: 'Bil-bekræftet',
    },
    stemme: 'stemme',
    stemmer: 'stemmer',
    svar: 'svar',
    kommentarerOverskrift: 'Kommentarer',
    sideAf: (n, af) => `Side ${n} af ${af}`,
    delta: { ny: 'NY', mere: (n) => `+${n} siden sidst` },
    csvKolonner: [
      'Placering',
      'Stemmer',
      'Ændring siden sidst',
      'Bil-bekræftede',
      'Varianter (bil-bekræftet)',
      'Antal svar',
      'Titel',
      'Bilmodel',
      'Softwareversion',
      'Telefon',
      'Telefon-OS',
      'Status',
      'Beskrivelse',
      'Oprettet',
      'Kommentarer',
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
    genereret: (dato, antal) => `Generated ${dato} · ${antal} entries`,
    intro:
      'This report compiles the software issues ("bugs") that the most owners in the ' +
      'community have confirmed experiencing. Each entry shows the number of confirmations ' +
      '(votes), affected model, software version and a description of how to reproduce the issue.',
    metaLabels: {
      model: 'Model',
      software: 'Software',
      status: 'Status',
      telefon: 'Phone',
      bilBekraeftet: 'Car-confirmed',
    },
    stemme: 'vote',
    stemmer: 'votes',
    svar: 'replies',
    kommentarerOverskrift: 'Comments',
    sideAf: (n, af) => `Page ${n} of ${af}`,
    delta: { ny: 'NEW', mere: (n) => `+${n} since last` },
    csvKolonner: [
      'Rank',
      'Votes',
      'Change since last',
      'Car-confirmed',
      'Variants (car-confirmed)',
      'Replies',
      'Title',
      'Car model',
      'Software version',
      'Phone',
      'Phone OS',
      'Status',
      'Description',
      'Created',
      'Comments',
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
    genereret: (dato, antal) => `Genererad ${dato} · ${antal} poster`,
    intro:
      'Den här rapporten samlar de programvarufel ("buggar") som flest ägare i gemenskapen ' +
      'har bekräftat att de upplever. Varje post visar antal bekräftelser (röster), berörd ' +
      'modell, programvaruversion samt en beskrivning av hur felet återskapas.',
    metaLabels: {
      model: 'Modell',
      software: 'Programvara',
      status: 'Status',
      telefon: 'Telefon',
      bilBekraeftet: 'Bil-bekräftad',
    },
    stemme: 'röst',
    stemmer: 'röster',
    svar: 'svar',
    kommentarerOverskrift: 'Kommentarer',
    sideAf: (n, af) => `Sida ${n} av ${af}`,
    delta: { ny: 'NY', mere: (n) => `+${n} sedan sist` },
    csvKolonner: [
      'Placering',
      'Röster',
      'Förändring sedan sist',
      'Bil-bekräftade',
      'Varianter (bil-bekräftade)',
      'Antal svar',
      'Titel',
      'Bilmodell',
      'Programvaruversion',
      'Telefon',
      'Telefon-OS',
      'Status',
      'Beskrivning',
      'Skapad',
      'Kommentarer',
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

// --- Rapport-ramme pr. type (fejl / ønsker / begge) ---
export type RapportType = 'fejl' | 'oenske' | 'begge';

export function erGyldigRapportType(s: string | null): RapportType {
  return s === 'oenske' ? 'oenske' : s === 'begge' ? 'begge' : 'fejl';
}

// Titel + intro afhænger af hvad rapporten dækker. Resten af rammen (undertitel,
// disclaimer, labels) er fælles.
export const RAPPORT_RAMME: Record<RapportSprog, Record<RapportType, { titel: string; intro: string }>> = {
  da: {
    fejl: {
      titel: 'BUGHERRER-RAPPORT',
      intro:
        'Denne rapport samler de softwarefejl ("bugherrer"), som flest ejere i fællesskabet ' +
        'har bekræftet at opleve. Hver post viser antal bekræftelser (stemmer), berørt model, ' +
        'softwareversion samt beskrivelse af, hvordan fejlen genskabes.',
    },
    oenske: {
      titel: 'ØNSKE-RAPPORT',
      intro:
        'Denne rapport samler de ønsker til ny funktionalitet, som flest ejere i fællesskabet ' +
        'har stemt på. Hver post viser antal stemmer, berørt model samt en beskrivelse af ønsket.',
    },
    begge: {
      titel: 'BUGHERRER & ØNSKER',
      intro:
        'Denne rapport samler både bekræftede softwarefejl og ønsker til ny funktionalitet fra ' +
        'Zeekr 7GT-fællesskabet, sorteret efter antal stemmer.',
    },
  },
  en: {
    fejl: {
      titel: 'BUGHERRER REPORT',
      intro:
        'This report compiles the software issues ("bugs") that the most owners in the ' +
        'community have confirmed experiencing. Each entry shows the number of confirmations ' +
        '(votes), affected model, software version and a description of how to reproduce the issue.',
    },
    oenske: {
      titel: 'FEATURE REQUEST REPORT',
      intro:
        'This report compiles the feature requests that the most owners in the community have ' +
        'voted for. Each entry shows the number of votes, affected model and a description of the request.',
    },
    begge: {
      titel: 'BUGS & FEATURE REQUESTS',
      intro:
        'This report compiles both confirmed software issues and feature requests from the ' +
        'Zeekr 7GT community, sorted by number of votes.',
    },
  },
  sv: {
    fejl: {
      titel: 'BUGHERRER-RAPPORT',
      intro:
        'Den här rapporten samlar de programvarufel ("buggar") som flest ägare i gemenskapen ' +
        'har bekräftat att de upplever. Varje post visar antal bekräftelser (röster), berörd ' +
        'modell, programvaruversion samt en beskrivning av hur felet återskapas.',
    },
    oenske: {
      titel: 'ÖNSKEMÅLSRAPPORT',
      intro:
        'Den här rapporten samlar de önskemål om ny funktionalitet som flest ägare i gemenskapen ' +
        'har röstat på. Varje post visar antal röster, berörd modell samt en beskrivning av önskemålet.',
    },
    begge: {
      titel: 'BUGGAR & ÖNSKEMÅL',
      intro:
        'Den här rapporten samlar både bekräftade programvarufel och önskemål om ny funktionalitet ' +
        'från Zeekr 7GT-gemenskapen, sorterade efter antal röster.',
    },
  },
};

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
