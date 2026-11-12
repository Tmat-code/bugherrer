import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { basisUrl } from '@/lib/notifikationer';

export const dynamic = 'force-dynamic';

// GET /api/foelg/bekraeft?token=XXX
// Bekræft-linket fra double-opt-in-mailen. Sætter bekraeftet=1 og sender brugeren
// videre til tråden med en lille kvittering. (GET er fint her: at bekræfte er ikke
// en destruktiv handling, så en mail-klient der prefetcher linket gør ingen skade.)
//
// VIGTIGT: redirect-URL'en bygges ud fra SITE_URL (basisUrl), IKKE req.url. Bag
// Cloudflare Tunnel + Coolify ser appen sig selv som http://0.0.0.0:3000 indvendigt,
// så en redirect udledt af req.url ville sende brugeren til 0.0.0.0:3000.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  const tilmelding = token ? queries.findTilmeldingVedToken.get(token) : null;

  if (!tilmelding) {
    return NextResponse.redirect(`${basisUrl()}/?foelg=ugyldig`);
  }

  queries.bekraeftTilmelding.run(token);
  return NextResponse.redirect(`${basisUrl()}/fejl/${tilmelding.fejl_id}?foelg=bekraeftet`);
}
