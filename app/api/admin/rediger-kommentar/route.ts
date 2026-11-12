import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';

// POST /api/admin/rediger-kommentar  { id, tekst }
// Moderation: ret teksten i en kommentar (admin + moderator) — fx fjern en
// skarp formulering eller en slåfejl uden at slette hele indlægget.
export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const { id, tekst } = await req.json().catch(() => ({}));
  const kommentarId = Number(id);
  const nyTekst = String(tekst || '').trim();

  if (!Number.isInteger(kommentarId) || kommentarId <= 0) {
    return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
  }
  if (nyTekst.length < 2) {
    return NextResponse.json({ error: 'Kommentaren kan ikke være tom.' }, { status: 422 });
  }
  if (nyTekst.length > 2000) {
    return NextResponse.json({ error: 'Kommentaren er for lang.' }, { status: 422 });
  }
  if (!queries.kommentarById.get(kommentarId)) {
    return NextResponse.json({ error: 'Kommentaren findes ikke' }, { status: 404 });
  }

  queries.opdaterKommentar.run({ id: kommentarId, tekst: nyTekst });
  return NextResponse.json({ ok: true });
}
