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
// efter at have stemt kan en ejer vaelge sin variant ("bil-bekraeftet"). 'Anden' er en
// escape for ejere, der ikke kan genkende deres praecise variant.
export const ZEEKR_VARIANTER = [
  'Privilege AWD',
  'Long Range RWD',
  'Core RWD',
  'Anden',
] as const;
export type ZeekrVariant = (typeof ZEEKR_VARIANTER)[number];

// Når true: ingen dropdown, alt antages at vaere STANDARD_BILMODEL.
export const KUN_EN_MODEL = BILMODELLER.length === 1;

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
  'Undersøges': { bg: 'bg-hjelm-200', text: 'text-asfalt-800', ikon: '🔍' },
  'Bekræftet': { bg: 'bg-advarsel-500', text: 'text-white', ikon: '⚠️' },
  'Sendt til Zeekr': { bg: 'bg-asfalt-700', text: 'text-hjelm-300', ikon: '📮' },
  'Løst!': { bg: 'bg-graes', text: 'text-white', ikon: '✅' },
};
