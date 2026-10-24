// Holder styr paa hvor mange svar (kommentarer) brugeren har set paa hver fejl.
// Gemmes pr. browser i localStorage — ingen konti, ingen server. Bruges til at
// vise "nyt svar"-markering paa forsiden, naar der er kommet svar siden sidst.
//
// Alt pakkes i try/catch: localStorage kan kaste (privat-tilstand, blokeret
// lager), og siden skal fungere uanset.

const NOEGLE = 'bugherrer_sete_svar_v1';

// fejlId -> antal sete kommentarer
export type SeteSvar = Record<number, number>;

export function hentSete(): SeteSvar | null {
  try {
    const raw = localStorage.getItem(NOEGLE);
    return raw ? (JSON.parse(raw) as SeteSvar) : null;
  } catch {
    return null;
  }
}

export function gemSete(map: SeteSvar): void {
  try {
    localStorage.setItem(NOEGLE, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

// Markér en enkelt fejls svar som set (kaldes naar brugeren aabner fejlen).
export function markerSet(fejlId: number, antal: number): void {
  const map = hentSete() ?? {};
  map[fejlId] = antal;
  gemSete(map);
}
