import { NextResponse } from 'next/server';
import { tjekKodeord, startSession } from '@/lib/auth';

export async function POST(req: Request) {
  const { kodeord } = await req.json().catch(() => ({ kodeord: '' }));
  if (!tjekKodeord(String(kodeord || ''))) {
    return NextResponse.json({ error: 'Forkert kodeord' }, { status: 401 });
  }
  startSession();
  return NextResponse.json({ ok: true });
}
