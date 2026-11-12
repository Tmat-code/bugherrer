import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/foelg/bekraeft?token=XXX
// Bekræft-linket fra double-opt-in-mailen. Sætter bekraeftet=1 og sender brugeren
// videre til tråden med en lille kvittering. (GET er fint her: at bekræfte er ikke
// en destruktiv handling, så en mail-klient der prefetcher linket gør ingen skade.)
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  const tilmelding = token ? queries.findTilmeldingVedToken.get(token) : null;

  if (!tilmelding) {
    return NextResponse.redirect(new URL('/?foelg=ugyldig', req.url));
  }

  queries.bekraeftTilmelding.run(token);
  return NextResponse.redirect(new URL(`/fejl/${tilmelding.fejl_id}?foelg=bekraeftet`, req.url));
}
