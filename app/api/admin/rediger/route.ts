import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';

// POST /api/admin/rediger — admin retter en fejl (fx aabenlyse slaafejl i en melding).
// Aendrer titel, softwareversion, beskrivelse og de valgfrie telefon-felter.
// Bilmodel og status roeres ikke her (status har sit eget endpoint).
export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Ugyldig anmodning' }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || !queries.fejlById.get(id)) {
    return NextResponse.json({ error: 'Ukendt fejl' }, { status: 404 });
  }

  const titel = String(body.titel || '').trim();
  const softwareversion = String(body.softwareversion || '').trim();
  const beskrivelse = String(body.beskrivelse || '').trim();
  const telefon = String(body.telefon || '').trim().slice(0, 60) || null;
  const telefonOs = String(body.telefonOs || '').trim().slice(0, 60) || null;

  const valideringsfejl: string[] = [];
  if (titel.length < 5 || titel.length > 140)
    valideringsfejl.push('Titel skal være mellem 5 og 140 tegn.');
  if (softwareversion.length < 2)
    valideringsfejl.push('Angiv en softwareversion.');
  if (beskrivelse.length < 15)
    valideringsfejl.push('Beskrivelsen skal være mindst 15 tegn.');

  if (valideringsfejl.length) {
    return NextResponse.json({ error: valideringsfejl.join(' ') }, { status: 422 });
  }

  queries.opdaterFejl.run({
    id,
    titel,
    softwareversion,
    beskrivelse,
    telefon,
    telefon_os: telefonOs,
  });

  return NextResponse.json({ ok: true });
}
