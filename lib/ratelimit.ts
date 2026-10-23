// Let rate-limiting i hukommelsen. Begraenser hvor mange gange en IP maa udfoere
// en handling (fx oprette en fejl) inden for et tidsvindue. Nul database-belastning.
//
// Bemaerk: tælleren nulstilles ved redeploy, og deles ikke mellem flere instanser.
// Det er helt fint paa denne skala (én container). Skal det en dag skaleres til
// flere instanser, flyttes dette til SQLite eller Redis.

type Stempler = number[];
const log = new Map<string, Stempler>();

// Ryd gamle noegler ind imellem, saa map'et ikke vokser i det uendelige.
let sidsteOprydning = Date.now();
function maaskeRyd(vindueMs: number) {
  const nu = Date.now();
  if (nu - sidsteOprydning < 60_000) return; // højst hvert minut
  sidsteOprydning = nu;
  for (const [noegle, stempler] of log) {
    const friske = stempler.filter((t) => t > nu - vindueMs);
    if (friske.length === 0) log.delete(noegle);
    else log.set(noegle, friske);
  }
}

/**
 * Returnerer true hvis handlingen er TILLADT, false hvis graensen er naaet.
 * @param noegle  fx `opret:<ip>` eller `kommentar:<ip>`
 * @param maks    antal tilladte handlinger i vinduet
 * @param vindueMs vinduets laengde i millisekunder (default 1 time)
 */
export function tilladt(noegle: string, maks: number, vindueMs = 3_600_000): boolean {
  maaskeRyd(vindueMs);
  const nu = Date.now();
  const friske = (log.get(noegle) || []).filter((t) => t > nu - vindueMs);
  if (friske.length >= maks) {
    log.set(noegle, friske);
    return false;
  }
  friske.push(nu);
  log.set(noegle, friske);
  return true;
}
