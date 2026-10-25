import { NextResponse } from 'next/server';
import { db, queries } from '@/lib/db';
import { findLignende } from '@/lib/search';
import { BILMODELLER, KUN_EN_MODEL, STANDARD_BILMODEL } from '@/lib/config';
import { verificerTurnstile, klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';

// GET /api/fejl?q=...  -> returnerer lignende fejl (bruges af tvungen-soegning-filteret)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const alle = queries.alleFejl.all();
  const lignende = findLignende(alle, q);
  return NextResponse.json({ lignende });
}

// POST /api/fejl  -> opretter en ny bygherre (fejl)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Ugyldig anmodning' }, { status: 400 });
  }

  // --- Spam-værn (lag 1-3) ---
  const ip = klientIp(req);

  // 1) Honeypot: er det skjulte felt udfyldt, er det en bot. Lad som om alt gik godt
  //    (så botten ikke laerer at prøve igen), men gem intet.
  if (String(body.honeypot || '').trim() !== '') {
    return NextResponse.json({ ok: true, id: 0 }, { status: 201 });
  }

  // 2) Rate-limiting: højst 5 oprettelser pr. IP i timen.
  if (!tilladt(`opret:${ip}`, 5)) {
    return NextResponse.json(
      { error: 'Du har oprettet mange bugherrer på kort tid. Prøv igen om lidt.' },
      { status: 429 }
    );
  }

  // 3) Turnstile: usynlig captcha. Springes over hvis værnet ikke er sat op.
  const okCaptcha = await verificerTurnstile(String(body.turnstileToken || ''), ip);
  if (!okCaptcha) {
    return NextResponse.json(
      { error: 'Kunne ikke bekræfte at du er et menneske. Genindlæs siden og prøv igen.' },
      { status: 403 }
    );
  }

  const titel = String(body.titel || '').trim();
  // Naar boardet kun daekker én model, tvinges den fast uanset hvad klienten sender.
  const bilmodel = KUN_EN_MODEL ? STANDARD_BILMODEL : String(body.bilmodel || '').trim();
  const softwareversion = String(body.softwareversion || '').trim();
  const beskrivelse = String(body.beskrivelse || '').trim();
  // Valgfrie telefon-oplysninger (relevante for software-/forbindelsesfejl).
  const telefon = String(body.telefon || '').trim().slice(0, 60) || null;
  const telefonOs = String(body.telefonOs || '').trim().slice(0, 60) || null;

  // Server-side validering (stol aldrig paa klienten).
  const fejl: string[] = [];
  if (titel.length < 5) fejl.push('Titel skal være mindst 5 tegn.');
  if (titel.length > 140) fejl.push('Titel må højst være 140 tegn.');
  if (!BILMODELLER.includes(bilmodel as (typeof BILMODELLER)[number]))
    fejl.push('Vælg en gyldig bilmodel.');
  if (softwareversion.length < 2) fejl.push('Angiv en softwareversion.');
  if (beskrivelse.length < 15)
    fejl.push('Beskriv venligst hvordan fejlen genskabes (mindst 15 tegn).');

  if (fejl.length) {
    return NextResponse.json({ error: fejl.join(' ') }, { status: 422 });
  }

  // Backend-dublettjek: hvis der findes et meget taet match, afvis og peg paa det.
  // (Frontend blokerer ogsaa, men dette er sikkerhedsnettet.)
  const alle = queries.alleFejl.all();
  const lignende = findLignende(alle, titel);
  if (lignende.length > 0 && lignende[0].titel.toLowerCase() === titel.toLowerCase()) {
    return NextResponse.json(
      { error: 'Der findes allerede en bugherre med næsten samme titel. Giv den en stemme i stedet.', lignende },
      { status: 409 }
    );
  }

  const info = queries.opretFejl.run({
    titel,
    bilmodel,
    softwareversion,
    beskrivelse,
    telefon,
    telefon_os: telefonOs,
  });

  // Opretteren faar automatisk den foerste stemme (default stemmer=1 i skemaet).
  return NextResponse.json({ ok: true, id: info.lastInsertRowid }, { status: 201 });
}
