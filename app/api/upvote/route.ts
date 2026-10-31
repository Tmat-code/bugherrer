import { NextResponse } from 'next/server';
import { afgivStemme, queries } from '@/lib/db';
import { getVoteToken, setVoteTokenCookie } from '@/lib/voteToken';
import { klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';

// Rate-limit: en ægte ejer stemmer højst på det antal bugs der findes (typisk under 60),
// så 60 stemmer pr. IP pr. 10 min rammer aldrig et menneske — men bremser en flod/script.
const STEM_MAKS = 60;
const STEM_VINDUE = 10 * 60 * 1000;

export async function POST(req: Request) {
  const ip = klientIp(req);
  if (!tilladt(`stem:${ip}`, STEM_MAKS, STEM_VINDUE)) {
    return NextResponse.json(
      { error: 'Du har stemt rigtig mange gange på kort tid. Vent et øjeblik og prøv igen.' },
      { status: 429 }
    );
  }

  const { fejlId } = await req.json().catch(() => ({ fejlId: null }));
  const id = Number(fejlId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Ugyldigt fejl-id' }, { status: 400 });
  }

  const fejl = queries.fejlById.get(id);
  if (!fejl) {
    return NextResponse.json({ error: 'Bugherren findes ikke' }, { status: 404 });
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
