import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { hashAdgangsKode, startSession } from '@/lib/auth';
import { klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';

// POST /api/tilmeld { token, kode }
// En inviteret person vælger selv sit kodeord via invitations-linket. Opretter en
// admin_adgange-række, bruger invitationen op, og logger personen direkte ind.
export async function POST(req: Request) {
  const ip = klientIp(req);
  if (!tilladt(`tilmeld:${ip}`, 15, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'For mange forsøg. Vent lidt og prøv igen.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const token = String(body.token || '');
  const kode = String(body.kode || '');

  const inv = token ? queries.findAabenInvitation.get(token) : null;
  if (!inv) {
    return NextResponse.json(
      { error: 'Linket er ugyldigt eller allerede brugt. Bed formanden om et nyt.' },
      { status: 400 }
    );
  }
  if (kode.length < 6) {
    return NextResponse.json({ error: 'Kodeordet skal være mindst 6 tegn.' }, { status: 422 });
  }

  const rolle = inv.rolle === 'admin' ? 'admin' : 'moderator';
  queries.opretAdgang.run({ navn: inv.navn, rolle, kode_hash: hashAdgangsKode(kode) });
  queries.brugInvitation.run(inv.id);
  startSession(rolle, inv.navn); // log personen direkte ind

  return NextResponse.json({ ok: true });
}
