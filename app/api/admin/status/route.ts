import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import { STATUSSER } from '@/lib/config';

export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const { id, status } = await req.json().catch(() => ({}));
  const fejlId = Number(id);
  if (!Number.isInteger(fejlId) || !STATUSSER.includes(status)) {
    return NextResponse.json({ error: 'Ugyldige data' }, { status: 400 });
  }
  queries.opdaterStatus.run({ id: fejlId, status });
  return NextResponse.json({ ok: true });
}
