import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { queries } from '@/lib/db';
import { byggBekraeftMail } from '@/lib/notifikationer';
import { verificerTurnstile, klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

// Simpel, pragmatisk e-mail-validering (ikke RFC-perfekt, men fanger slåfejl).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/foelg  { fejlId, email, honeypot?, turnstileToken? }
// Tilmeld dig notifikationer for en tråd. Double opt-in: vi gemmer en UBEKRAEFTET
// tilmelding og lægger en bekræft-mail i køen. Først når bekræft-linket er klikket,
// får adressen notifikationer. Det beskytter mod at tilmelde andres adresser.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Ugyldig anmodning' }, { status: 400 });

  const ip = klientIp(req);
  // Honeypot udfyldt -> bot. Foregiv succes, gem intet.
  if (String(body.honeypot || '').trim() !== '') {
    return NextResponse.json({ ok: true, status: 'bekraeft_sendt' }, { status: 201 });
  }
  // Højst 10 tilmeldinger pr. IP i timen.
  if (!tilladt(`foelg:${ip}`, 10)) {
    return NextResponse.json(
      { error: 'Du har tilmeldt dig mange gange på kort tid. Prøv igen om lidt.' },
      { status: 429 }
    );
  }
  const okCaptcha = await verificerTurnstile(String(body.turnstileToken || ''), ip);
  if (!okCaptcha) {
    return NextResponse.json(
      { error: 'Kunne ikke bekræfte at du er et menneske. Genindlæs siden og prøv igen.' },
      { status: 403 }
    );
  }

  const fejlId = Number(body.fejlId);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 160);

  if (!Number.isInteger(fejlId) || fejlId <= 0)
    return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
  if (!EMAIL_RE.test(email))
    return NextResponse.json({ error: 'Skriv en gyldig mailadresse.' }, { status: 422 });

  const fejl = queries.fejlById.get(fejlId);
  if (!fejl) return NextResponse.json({ error: 'Tråden findes ikke' }, { status: 404 });

  const eksisterende = queries.findTilmelding.get(fejlId, email);

  // Allerede bekraeftet følger — intet at gøre, og vi sender ikke en ny mail.
  if (eksisterende && eksisterende.bekraeftet === 1) {
    return NextResponse.json({ ok: true, status: 'allerede' }, { status: 200 });
  }

  // Nyt token (bruges til bekræft + afmeld).
  const token = crypto.randomUUID();
  if (eksisterende) {
    // Ubekraeftet fra før — forny token og gen-send bekræft-mailen.
    queries.nytTokenPaaTilmelding.run({ id: eksisterende.id, token });
  } else {
    queries.opretTilmelding.run({ fejl_id: fejlId, email, token });
  }

  const mail = byggBekraeftMail(fejl, token);
  queries.koeMail.run({ email, emne: mail.emne, html: mail.html });

  return NextResponse.json({ ok: true, status: 'bekraeft_sendt' }, { status: 201 });
}
