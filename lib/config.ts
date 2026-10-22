// Centraliseret konfiguration, saa domaene og visningsnavn kun staar ét sted.
// Alt kan overstyres via environment-variabler i Coolify.

export const SITE = {
  name: process.env.SITE_NAME || 'Bygherrer-Listen',
  domain: process.env.SITE_DOMAIN || 'bugherrer.dk',
};

export const DISCLAIMER =
  `${SITE.domain} er et 100% uafhaengigt, privat initiativ drevet af og for ` +
  `bilentusiaster. Siden er ikke tilknyttet, sponsoreret eller godkendt af ` +
  `ZEEKR Denmark ApS, Geely eller deres datterselskaber.`;

// Bilmodeller til dropdown. Tilfoej flere her hvis faellesskabet vokser.
export const BILMODELLER = ['Zeekr 001', 'Zeekr X', 'Zeekr 7GT', 'Andet'] as const;
export type Bilmodel = (typeof BILMODELLER)[number];

// Status-flow for en bygherre (fejl).
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
