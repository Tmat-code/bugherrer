import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { verificerTurnstile, klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Ugyldig anmodning' }, { status: 400 });

  // --- Spam-værn ---
  const ip = klientIp(req);
  // Honeypot udfyldt -> bot. Foregiv succes, gem intet.
  if (String(body.honeypot || '').trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  // Rate-limiting: højst 15 kommentarer pr. IP i timen.
  if (!tilladt(`kommentar:${ip}`, 15)) {
    return NextResponse.json(
      { error: 'Du har skrevet mange kommentarer på kort tid. Prøv igen om lidt.' },
      { status: 429 }
    );
  }
  // Turnstile (springes over hvis ikke sat op).
  const okCaptcha = await verificerTurnstile(String(body.turnstileToken || ''), ip);
  if (!okCaptcha) {
    return NextResponse.json(
      { error: 'Kunne ikke bekræfte at du er et menneske. Genindlæs siden og prøv igen.' },
      { status: 403 }
    );
  }

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
  if (!fejl) return NextResponse.json({ error: 'Bugherren findes ikke' }, { status: 404 });

  queries.opretKommentar.run({ fejl_id, navn, tekst });
  return NextResponse.json({ ok: true }, { status: 201 });
}
