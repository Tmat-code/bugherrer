import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';

export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const { id } = await req.json().catch(() => ({}));
  const fejlId = Number(id);
  if (!Number.isInteger(fejlId)) {
    return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
  }
  queries.sletFejl.run(fejlId);
  return NextResponse.json({ ok: true });
}
