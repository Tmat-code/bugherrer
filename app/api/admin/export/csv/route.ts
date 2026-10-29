import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import { I18N, erGyldigtSprog, oversaetStatus, deltaTekst } from '@/lib/rapport-i18n';
import { oversaetFejl } from '@/lib/oversaet';
import { hentKommentarerTilRapport } from '@/lib/rapport-kommentarer';

export async function GET(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const antal = Math.min(Math.max(Number(searchParams.get('top')) || 20, 1), 200);
  const sprog = erGyldigtSprog(searchParams.get('sprog'));
  const kunAendrede = searchParams.get('kunAendrede') === '1';
  const medKommentarer = searchParams.get('kommentarer') === '1';
  const t = I18N[sprog];
  const raaFejl = kunAendrede
    ? queries.topFejlKunAendrede.all(antal)
    : queries.topFejl.all(antal);
  const fejl = await oversaetFejl(raaFejl, sprog);
  const kommMap = medKommentarer ? await hentKommentarerTilRapport(fejl, sprog) : {};

  const kolonner = t.csvKolonner;

  function esc(v: string | number): string {
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  }

  const raekker = fejl.map((f, i) => {
    const vrows = queries.ejerVarianter.all(f.id);
    const bilBekr = vrows.reduce((s, r) => s + r.n, 0);
    const varianter = vrows.map((r) => `${r.n}× ${r.variant}`).join(', ');
    const antalSvar = queries.antalKommForFejl.get(f.id)!.n;
    const kommentarer = (kommMap[f.id] ?? [])
      .map((k) => `${k.navn}: ${k.tekst}`)
      .join('  |  ');
    return [
      i + 1,
      f.stemmer,
      deltaTekst(f, sprog),
      bilBekr,
      varianter,
      antalSvar,
      f.titel,
      f.bilmodel,
      f.softwareversion,
      f.telefon ?? '',
      f.telefon_os ?? '',
      oversaetStatus(f.status, sprog),
      f.beskrivelse,
      f.oprettet,
      kommentarer,
    ]
      .map(esc)
      .join(';');
  });

  // BOM + semikolon-separeret, saa det aabner korrekt i dansk Excel/LibreOffice Calc.
  const csv = '﻿' + [kolonner.map(esc).join(';'), ...raekker].join('\r\n');

  const dato = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bugherrer-${t.filnavn}-top${antal}-${dato}.csv"`,
    },
  });
}
