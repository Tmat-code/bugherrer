import { NextResponse } from 'next/server';
import { db, queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';

// POST /api/admin/marker-sendt — markér de top-N fejl (samme udvalg som eksporten)
// som "sendt til Zeekr nu". Gemmer deres nuvaerende stemmetal som nulpunkt, saa de
// foerst kommer med igen i "kun nye + eskalerende", hvis de faar flere stemmer.
export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const antal = Math.min(Math.max(Number(body.top) || 20, 1), 200);
  const kunAendrede = Boolean(body.kunAendrede);

  const fejl = kunAendrede
    ? queries.topFejlKunAendrede.all(antal)
    : queries.topFejl.all(antal);

  const markerAlle = db.transaction((ider: number[]) => {
    for (const id of ider) queries.markerSendt.run(id);
  });
  markerAlle(fejl.map((f) => f.id));

  return NextResponse.json({ ok: true, antal: fejl.length });
}
