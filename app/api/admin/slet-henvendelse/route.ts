import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';

export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const { id } = await req.json().catch(() => ({}));
  const henvId = Number(id);
  if (!Number.isInteger(henvId)) {
    return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
  }
  queries.sletHenvendelse.run(henvId);
  return NextResponse.json({ ok: true });
}
