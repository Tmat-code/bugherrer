import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Ugyldig anmodning' }, { status: 400 });

  const fejl_id = Number(body.fejlId);
  const navn = String(body.navn || '').trim().slice(0, 40) || 'Anonym bygmester';
  const tekst = String(body.tekst || '').trim();

  if (!Number.isInteger(fejl_id) || fejl_id <= 0)
    return NextResponse.json({ error: 'Ugyldigt fejl-id' }, { status: 400 });
  if (tekst.length < 2)
    return NextResponse.json({ error: 'Skriv en kommentar først.' }, { status: 422 });
  if (tekst.length > 2000)
    return NextResponse.json({ error: 'Kommentaren er for lang.' }, { status: 422 });

  const fejl = queries.fejlById.get(fejl_id);
  if (!fejl) return NextResponse.json({ error: 'Bygherren findes ikke' }, { status: 404 });

  queries.opretKommentar.run({ fejl_id, navn, tekst });
  return NextResponse.json({ ok: true }, { status: 201 });
}
