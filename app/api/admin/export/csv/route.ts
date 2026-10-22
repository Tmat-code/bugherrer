import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';

export async function GET(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const antal = Math.min(Math.max(Number(searchParams.get('top')) || 20, 1), 200);
  const fejl = queries.topFejl.all(antal);

  const kolonner = ['Placering', 'Stemmer', 'Titel', 'Bilmodel', 'Softwareversion', 'Status', 'Beskrivelse', 'Oprettet'];

  function esc(v: string | number): string {
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  }

  const raekker = fejl.map((f, i) =>
    [i + 1, f.stemmer, f.titel, f.bilmodel, f.softwareversion, f.status, f.beskrivelse, f.oprettet]
      .map(esc)
      .join(';')
  );

  // BOM + semikolon-separeret, saa det aabner korrekt i dansk Excel/LibreOffice Calc.
  const csv = '﻿' + [kolonner.map(esc).join(';'), ...raekker].join('\r\n');

  const dato = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bygherrer-top${antal}-${dato}.csv"`,
    },
  });
}
