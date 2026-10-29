import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { getVoteToken, setVoteTokenCookie } from '@/lib/voteToken';
import { ZEEKR_VARIANTER } from '@/lib/config';

// POST /api/bekraeft-ejer  { fejlId, variant }
// Markerer den aktuelle browsers stemme som "bil-bekraeftet" med en 7GT-variant.
// Kraever at browseren allerede har stemt paa fejlen (der skal findes en stemmer_log-raekke).
// Gemmer KUN variant-navnet — ingen VIN, intet personhenfoerbart.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.fejlId);
  const variant = String(body?.variant || '');

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Ugyldigt fejl-id' }, { status: 400 });
  }
  if (!(ZEEKR_VARIANTER as readonly string[]).includes(variant)) {
    return NextResponse.json({ error: 'Ukendt variant' }, { status: 400 });
  }
  if (!queries.fejlById.get(id)) {
    return NextResponse.json({ error: 'Bugherren findes ikke' }, { status: 404 });
  }

  const token = getVoteToken();
  const res = queries.bekraeftEjer.run({ fejlId: id, token, variant });
  setVoteTokenCookie(token);

  // .changes === 0: browseren har ikke stemt paa fejlen endnu.
  if (res.changes === 0) {
    return NextResponse.json(
      { error: 'Stem på fejlen først, så kan du bekræfte ejerskab.' },
      { status: 409 }
    );
  }

  const antal = queries.antalEjerBekraeftet.get(id)!.n;
  return NextResponse.json({ ok: true, antal });
}
