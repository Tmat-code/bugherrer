import { NextResponse } from 'next/server';
import { db, queries } from '@/lib/db';
import { findLignende } from '@/lib/search';
import { BILMODELLER, KUN_EN_MODEL, STANDARD_BILMODEL } from '@/lib/config';

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

  const titel = String(body.titel || '').trim();
  // Naar boardet kun daekker én model, tvinges den fast uanset hvad klienten sender.
  const bilmodel = KUN_EN_MODEL ? STANDARD_BILMODEL : String(body.bilmodel || '').trim();
  const softwareversion = String(body.softwareversion || '').trim();
  const beskrivelse = String(body.beskrivelse || '').trim();

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

  const info = queries.opretFejl.run({ titel, bilmodel, softwareversion, beskrivelse });

  // Opretteren faar automatisk den foerste stemme (default stemmer=1 i skemaet).
  return NextResponse.json({ ok: true, id: info.lastInsertRowid }, { status: 201 });
}
