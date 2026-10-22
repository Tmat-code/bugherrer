import { NextResponse } from 'next/server';
import { afgivStemme, queries } from '@/lib/db';
import { getVoteToken, setVoteTokenCookie } from '@/lib/voteToken';

export async function POST(req: Request) {
  const { fejlId } = await req.json().catch(() => ({ fejlId: null }));
  const id = Number(fejlId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Ugyldigt fejl-id' }, { status: 400 });
  }

  const fejl = queries.fejlById.get(id);
  if (!fejl) {
    return NextResponse.json({ error: 'Bygherren findes ikke' }, { status: 404 });
  }

  const token = getVoteToken();
  const stemte = afgivStemme(id, token);
  setVoteTokenCookie(token);

  const opdateret = queries.fejlById.get(id)!;
  return NextResponse.json({
    ok: true,
    allerede: !stemte,
    stemmer: opdateret.stemmer,
  });
}
