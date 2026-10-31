import { NextResponse } from 'next/server';
import { tjekKodeord, startSession, hashAdgangsKode } from '@/lib/auth';
import { queries } from '@/lib/db';
import { klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const ip = klientIp(req);
  // Let brute-force-værn: højst 10 forsøg pr. IP pr. 15 min.
  if (!tilladt(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'For mange forsøg. Vent lidt og prøv igen.' },
      { status: 429 }
    );
  }

  const { kodeord } = await req.json().catch(() => ({ kodeord: '' }));
  const kode = String(kodeord || '');

  // 1) Formandens master-kodeord → fuld admin.
  if (tjekKodeord(kode)) {
    startSession('admin', 'Formand');
    return NextResponse.json({ ok: true });
  }

  // 2) Ekstra adgang (moderator eller admin), oprettet i admin-panelet.
  if (kode) {
    const adgang = queries.findAktivAdgang.get(hashAdgangsKode(kode));
    if (adgang) {
      queries.opdaterAdgangBrugt.run(adgang.id);
      startSession(adgang.rolle === 'admin' ? 'admin' : 'moderator', adgang.navn);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: 'Forkert kodeord' }, { status: 401 });
}
