import { NextResponse } from 'next/server';
import { fortrydSidsteMarkering } from '@/lib/db';
import { erAdmin } from '@/lib/auth';

// POST /api/admin/fortryd-markering — nødbremse: rul den seneste "Dan rapport"-markering
// tilbage, hvis rapporten alligevel ikke blev sendt til Zeekr. KUN admin.
export async function POST() {
  if (!erAdmin()) {
    return NextResponse.json({ error: 'Kun admin' }, { status: 401 });
  }

  const res = fortrydSidsteMarkering();
  if (!res) {
    return NextResponse.json({ error: 'Der er ingen markering at fortryde.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, antal: res.antal });
}
