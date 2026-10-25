import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import { klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';

// POST /api/loesning  { fejlId, kommentarId }
// - kommentarId = tal  -> markér den kommentar som løsning
// - kommentarId = null -> fjern markeringen (kun admin)
//
// Regler: alle må markere en løsning når der IKKE er en i forvejen.
// Er der allerede en løsning, kan kun admin ændre eller fjerne den.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Ugyldig anmodning' }, { status: 400 });

  const ip = klientIp(req);
  if (!tilladt(`loesning:${ip}`, 30)) {
    return NextResponse.json({ error: 'For mange forsøg. Prøv igen om lidt.' }, { status: 429 });
  }

  const fejlId = Number(body.fejlId);
  const admin = erLoggetInd();

  const fejl = queries.fejlById.get(fejlId);
  if (!fejl) return NextResponse.json({ error: 'Bugherren findes ikke' }, { status: 404 });

  // Fjern løsning — kun admin.
  if (body.kommentarId === null || body.kommentarId === undefined) {
    if (!admin) {
      return NextResponse.json(
        { error: 'Kun formanden kan fjerne en markeret løsning.' },
        { status: 403 }
      );
    }
    queries.saetLoesning.run({ fejlId, kid: null });
    return NextResponse.json({ ok: true, loesning_kommentar_id: null });
  }

  const kommentarId = Number(body.kommentarId);
  const kommentar = queries.kommentarById.get(kommentarId);
  if (!kommentar || kommentar.fejl_id !== fejlId) {
    return NextResponse.json({ error: 'Ugyldig kommentar' }, { status: 400 });
  }

  // Er der allerede en løsning, kan kun admin ændre den.
  if (fejl.loesning_kommentar_id != null && !admin) {
    return NextResponse.json(
      { error: 'Der er allerede markeret en løsning. Kun formanden kan ændre den.' },
      { status: 403 }
    );
  }

  queries.saetLoesning.run({ fejlId, kid: kommentarId });
  return NextResponse.json({ ok: true, loesning_kommentar_id: kommentarId });
}
