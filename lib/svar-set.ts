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

// --- "Mine meldinger" ---
// Fejl-ID'er som DENNE browser selv har oprettet, saa man nemt kan foelge sine
// egne meldinger og se naar nogen har svaret. Pr. browser, ingen konti.
const MINE_NOEGLE = 'bugherrer_mine_meldinger_v1';

export function hentMine(): number[] {
  try {
    const raw = localStorage.getItem(MINE_NOEGLE);
    const liste = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(liste) ? liste.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

export function tilfoejMin(fejlId: number): void {
  try {
    const liste = hentMine();
    if (!liste.includes(fejlId)) {
      liste.push(fejlId);
      localStorage.setItem(MINE_NOEGLE, JSON.stringify(liste));
    }
  } catch {
    /* ignore */
  }
}
