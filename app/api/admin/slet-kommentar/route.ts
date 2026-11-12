import { NextResponse } from 'next/server';
import { fjernKommentar } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';

// POST /api/admin/slet-kommentar  { id }
// Moderation: slet en enkelt kommentar (admin + moderator). Rydder samtidig en
// evt. "løsning"-markering, der pegede på den.
export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const { id } = await req.json().catch(() => ({}));
  const kommentarId = Number(id);
  if (!Number.isInteger(kommentarId) || kommentarId <= 0) {
    return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
  }
  const slettet = fjernKommentar(kommentarId);
  return NextResponse.json({ ok: true, slettet });
}
