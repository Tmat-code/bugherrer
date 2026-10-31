import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { queries } from '@/lib/db';
import { erAdmin } from '@/lib/auth';

// Styring af ekstra admin-adgange og invitationer. KUN for fuld admin (formand).
export async function POST(req: Request) {
  if (!erAdmin()) {
    return NextResponse.json({ error: 'Kun for admin' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const handling = String(body.handling || '');

  // Opret en invitation -> returnér et token, som admin sender som link.
  if (handling === 'inviter') {
    const navn = String(body.navn || '').trim().slice(0, 40);
    const rolle = body.rolle === 'admin' ? 'admin' : 'moderator';
    if (navn.length < 1) {
      return NextResponse.json({ error: 'Angiv et navn' }, { status: 400 });
    }
    const token = crypto.randomBytes(24).toString('base64url');
    queries.opretInvitation.run({ navn, rolle, token, nulstil_adgang_id: null });
    return NextResponse.json({ ok: true, token, navn, rolle });
  }

  // Nulstil en eksisterende adgangs kodeord: lav et nyt link til SAMME person.
  if (handling === 'nulstil') {
    const id = Number(body.id);
    const adgang = Number.isInteger(id) ? queries.adgangById.get(id) : null;
    if (!adgang) return NextResponse.json({ error: 'Ukendt adgang' }, { status: 404 });
    const token = crypto.randomBytes(24).toString('base64url');
    queries.opretInvitation.run({
      navn: adgang.navn,
      rolle: adgang.rolle,
      token,
      nulstil_adgang_id: adgang.id,
    });
    return NextResponse.json({ ok: true, token, navn: adgang.navn, rolle: adgang.rolle });
  }

  // Spær/genåbn en adgang.
  if (handling === 'aktiv') {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
    queries.saetAdgangAktiv.run({ id, aktiv: body.aktiv ? 1 : 0 });
    return NextResponse.json({ ok: true });
  }

  // Slet en adgang helt.
  if (handling === 'slet-adgang') {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
    queries.sletAdgang.run(id);
    return NextResponse.json({ ok: true });
  }

  // Slet en invitation (fx hvis linket ikke skal kunne bruges).
  if (handling === 'slet-invitation') {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
    queries.sletInvitation.run(id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ukendt handling' }, { status: 400 });
}
