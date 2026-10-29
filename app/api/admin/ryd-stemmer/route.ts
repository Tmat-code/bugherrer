import { NextResponse } from 'next/server';
import { queries, rydStemmerFoer } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';

// POST /api/admin/ryd-stemmer  { foerDato: "YYYY-MM-DD", bekraeft?: boolean }
// Uden bekraeft: returnerer kun ANTAL stemmer før datoen (forhåndsvisning).
// Med bekraeft=true: sletter dem og retter stemmetallet pr. fejl.
//
// Datoen tolkes som "før YYYY-MM-DD 00:00" (UTC). Tidsstempler gemmes som
// "YYYY-MM-DD HH:MM:SS", så en ren streng-sammenligning rammer korrekt.
export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const foerDato = String(body?.foerDato || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(foerDato)) {
    return NextResponse.json({ error: 'Ugyldig dato (brug ÅÅÅÅ-MM-DD)' }, { status: 400 });
  }

  const cutoff = foerDato; // "2026-10-29" < "2026-10-29 08:00:00" lexikografisk

  if (!body?.bekraeft) {
    const antal = queries.antalStemmerFoer.get(cutoff)!.n;
    return NextResponse.json({ ok: true, antal });
  }

  const slettet = rydStemmerFoer(cutoff);
  return NextResponse.json({ ok: true, slettet });
}
