// Centraliseret konfiguration, saa domaene og visningsnavn kun staar ét sted.
// Alt kan overstyres via environment-variabler i Coolify.

export const SITE = {
  name: process.env.SITE_NAME || 'Bugherrer',
  domain: process.env.SITE_DOMAIN || 'bugherrer.dk',
};

export const DISCLAIMER =
  `${SITE.domain} er et 100% uafhængigt, privat initiativ drevet af og for ` +
  `bilentusiaster. Siden er ikke tilknyttet, sponsoreret eller godkendt af ` +
  `ZEEKR Denmark ApS, Geely eller deres datterselskaber.`;

// Boardet er PT. begraenset til Zeekr 7GT. Strukturen er bevidst bevaret, saa det
// er en lille aendring at aabne for flere modeller hvis faellesskabet vokser:
//  - saet KUN_EN_MODEL = false
//  - tilfoej modellerne til BILMODELLER
// Saa dukker dropdownen op igen i opret-formularen af sig selv.
export const BILMODELLER = ['Zeekr 7GT'] as const;
export type Bilmodel = (typeof BILMODELLER)[number];

// Standardmodel for nye fejl (bruges naar der kun er én model).
export const STANDARD_BILMODEL: Bilmodel = 'Zeekr 7GT';

// Officielle 7GT-varianter (Zeekrs egne navne). Bruges til det lette ejerskabs-signal:
// efter at have stemt kan en ejer vaelge sin variant ("bil-bekraeftet"). Kun de rigtige
// varianter — en aegte ejer kender sin, og det giver renere data til Zeekr.
export const ZEEKR_VARIANTER = ['Privilege AWD', 'Long Range RWD', 'Core RWD'] as const;
export type ZeekrVariant = (typeof ZEEKR_VARIANTER)[number];

// Når true: ingen dropdown, alt antages at vaere STANDARD_BILMODEL.
export const KUN_EN_MODEL = BILMODELLER.length === 1;

// Meldingstype: boardet samler både FEJL (bugs) og ØNSKER (ønsker til ny funktionalitet).
// Samme maskineri (stemmer, bekraeftelse, kommentarer, eksport) for begge — kun type adskiller.
export const MELDINGSTYPER = {
  fejl: { navn: 'Fejl', flertal: 'fejl', ikon: '🛠️', badge: 'Fejl' },
  oenske: { navn: 'Ønske', flertal: 'ønsker', ikon: '💡', badge: 'Ønske' },
} as const;
export type MeldingsType = keyof typeof MELDINGSTYPER; // 'fejl' | 'oenske'

export function erGyldigType(t: string | null | undefined): MeldingsType {
  return t === 'oenske' ? 'oenske' : 'fejl';
}

// Status-flow for en bugherre (fejl).
export const STATUSSER = [
  'Undersøges',
  'Bekræftet',
  'Sendt til Zeekr',
  'Løst!',
] as const;
export type Status = (typeof STATUSSER)[number];

// Farver + ikoner til statustags (byggeplads-tema).
export const STATUS_STYLE: Record<
  Status,
  { bg: string; text: string; ikon: string }
> = {
  // Et forløb, der føles som fremdrift — fra "i bunken" til "løst". "Bekræftet" skal
  // signalere noget SOLIDT/positivt (flueben), ikke en advarsel.
  'Undersøges': { bg: 'bg-asfalt-100', text: 'text-asfalt-600', ikon: '🔍' },
  'Bekræftet': { bg: 'bg-hjelm-400', text: 'text-asfalt-900', ikon: '✓' },
  'Sendt til Zeekr': { bg: 'bg-asfalt-800', text: 'text-hjelm-300', ikon: '📮' },
  'Løst!': { bg: 'bg-graes', text: 'text-white', ikon: '✅' },
};

// Antal bil-bekraeftede ejere foer en fejl automatisk regnes som "Bekræftet".
export const BEKRAEFT_TAERSKEL = 5;

// Status UDLEDES automatisk som et forloeb, saa der er mindst mulig administration:
//   Undersøges  -> Bekræftet (>= BEKRAEFT_TAERSKEL bil-bekraeftede ejere)
//               -> Sendt til Zeekr (har vaeret med i en afsendt rapport)
//               -> Løst! (sat manuelt, naar Zeekr har fikset den)
// Vi viser det laengste trin, fejlen har naaet. "Løst!" er det eneste manuelle felt.
export function beregnStatus(f: {
  loest_dato: string | null;
  sidst_sendt_dato: string | null;
  bekraeftedeBiler: number;
}): Status {
  if (f.loest_dato) return 'Løst!';
  if (f.sidst_sendt_dato) return 'Sendt til Zeekr';
  if (f.bekraeftedeBiler >= BEKRAEFT_TAERSKEL) return 'Bekræftet';
  return 'Undersøges';
}
