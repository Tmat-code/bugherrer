import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/foelg/afmeld  { token }
// Afmeld notifikationer for én tråd. Kaldes fra bekræftelses-knappen på
// /foelg/afmeld-siden (POST, ikke GET — så en mail-klient der prefetcher
// afmeld-linket ikke kan afmelde folk utilsigtet). Idempotent: ukendt token er ok.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token || '');
  if (token) queries.sletTilmelding.run(token);
  return NextResponse.json({ ok: true });
}
