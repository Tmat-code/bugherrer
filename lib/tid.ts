// Relativ tid paa dansk, fx "for 2 dage siden".
// SQLite gemmer tidsstempler som UTC uden zone-marker ("2026-10-23 19:25:21"),
// saa vi tilfoejer 'Z' naar vi parser, for at faa den korrekte forskel.

export function relativTid(sqliteDato: string): string {
  const then = new Date(sqliteDato.replace(' ', 'T') + 'Z').getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const sek = Math.floor(diffMs / 1000);
  const min = Math.floor(sek / 60);
  const timer = Math.floor(min / 60);
  const dage = Math.floor(timer / 24);
  const uger = Math.floor(dage / 7);
  const maaneder = Math.floor(dage / 30);
  const aar = Math.floor(dage / 365);

  if (sek < 45) return 'lige nu';
  if (min < 60) return `for ${min} min. siden`;
  if (timer < 24) return `for ${timer} ${timer === 1 ? 'time' : 'timer'} siden`;
  if (dage === 1) return 'i går';
  if (dage < 7) return `for ${dage} dage siden`;
  if (uger < 5) return `for ${uger} ${uger === 1 ? 'uge' : 'uger'} siden`;
  if (maaneder < 12) return `for ${maaneder} ${maaneder === 1 ? 'måned' : 'måneder'} siden`;
  return `for ${aar} ${aar === 1 ? 'år' : 'år'} siden`;
}
