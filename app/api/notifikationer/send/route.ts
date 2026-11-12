import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { sendMail, resendKonfigureret } from '@/lib/resend';

export const dynamic = 'force-dynamic';

// GET /api/notifikationer/send?token=XXX
// Tømmer notifikations-køen (outbox) ved at sende via Resend. Beregnet til at blive
// kaldt af n8n på en tidsplan (fx hvert 2.-3. minut) — samme mønster som det
// eksisterende /api/admin/notifikation. Beskyttet med en delt hemmelighed:
// NOTIFIKATION_SEND_TOKEN (eller genbrug NOTIFIKATION_TOKEN). Er ingen af dem sat,
// er endpointet slået fra.
//
// Robusthed: lykkes en mail, markeres den sendt. En permanent afvisning (4xx, fx en
// ugyldig adresse) gives op (markeres sendt, så den ikke klumper køen til). En
// midlertidig fejl (5xx / 429 / netværk) lader rækken ligge, og vi stopper — så
// prøver næste flush igen.
const BATCH = 50;

export async function GET(req: Request) {
  const forventet = process.env.NOTIFIKATION_SEND_TOKEN || process.env.NOTIFIKATION_TOKEN || '';
  if (!forventet) {
    return NextResponse.json({ error: 'Notifikations-afsendelse ikke konfigureret' }, { status: 404 });
  }
  if (new URL(req.url).searchParams.get('token') !== forventet) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  if (!resendKonfigureret()) {
    return NextResponse.json({ error: 'RESEND_API_KEY ikke sat' }, { status: 503 });
  }

  const mails = queries.usendteMails.all(BATCH);
  let sendt = 0;
  let opgivet = 0;
  const fejl: string[] = [];

  for (const m of mails) {
    const res = await sendMail(m.email, m.emne, m.html);
    if (res.ok) {
      queries.markerMailSendt.run(m.id);
      sendt++;
      continue;
    }
    // Permanent afvisning (ikke 429): giv op på denne, så den ikke blokerer køen.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      queries.markerMailSendt.run(m.id);
      opgivet++;
      fejl.push(`#${m.id} opgivet: ${res.fejl}`);
      continue;
    }
    // Midlertidig fejl — lad rækken ligge og stop; næste flush prøver igen.
    fejl.push(`#${m.id} udskudt: ${res.fejl}`);
    break;
  }

  const tilbage = queries.antalUsendte.get()!.n;
  return NextResponse.json({ ok: true, sendt, opgivet, tilbage, fejl });
}
