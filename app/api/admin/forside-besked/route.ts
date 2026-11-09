import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erAdmin } from '@/lib/auth';

// POST /api/admin/forside-besked  { tekst, aktiv }
// Admin-styret besked på forsiden (fx "Vi har sendt rapporten til Zeekr"). Kun admin.
export async function POST(req: Request) {
  if (!erAdmin()) {
    return NextResponse.json({ error: 'Kun admin' }, { status: 401 });
  }
  const { tekst, aktiv } = await req.json().catch(() => ({}));
  queries.saetMeta.run({ noegle: 'forside_besked', vaerdi: String(tekst ?? '').slice(0, 280) });
  queries.saetMeta.run({ noegle: 'forside_besked_aktiv', vaerdi: aktiv ? '1' : '0' });
  return NextResponse.json({ ok: true });
}
