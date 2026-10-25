import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { verificerTurnstile, klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';

// POST /api/kontakt  -> gemmer en henvendelse (vises i admin)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Ugyldig anmodning' }, { status: 400 });

  // --- Spam-værn ---
  const ip = klientIp(req);
  // Honeypot udfyldt -> bot. Foregiv succes, gem intet.
  if (String(body.honeypot || '').trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  // Rate-limiting: højst 5 henvendelser pr. IP i timen.
  if (!tilladt(`kontakt:${ip}`, 5)) {
    return NextResponse.json(
      { error: 'Du har sendt mange henvendelser på kort tid. Prøv igen om lidt.' },
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

  const navn = String(body.navn || '').trim().slice(0, 80);
  const email = String(body.email || '').trim().slice(0, 120);
  const besked = String(body.besked || '').trim();

  if (besked.length < 5)
    return NextResponse.json({ error: 'Skriv venligst en besked (mindst 5 tegn).' }, { status: 422 });
  if (besked.length > 4000)
    return NextResponse.json({ error: 'Beskeden er for lang.' }, { status: 422 });
  if (email && !email.includes('@'))
    return NextResponse.json({ error: 'Angiv en gyldig e-mail, eller lad feltet stå tomt.' }, { status: 422 });

  queries.opretHenvendelse.run({ navn, email, besked });
  return NextResponse.json({ ok: true }, { status: 201 });
}
