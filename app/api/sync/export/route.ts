import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Read-only eksport af bugherrer-data, allerede mappet til zeekr-garages form.
// Token-beskyttet. n8n henter denne og sender til garages /api/sync/import.

const STATUS: Record<string, string> = {
  'Undersøges': 'ny',
  'Bekræftet': 'bekraeftet',
  'Sendt til Zeekr': 'sendt_til_zeekr',
  'Løst!': 'loest_i_ota',
  'Løst': 'loest_i_ota',
};
const MODEL_SLUG: Record<string, string> = {
  'Zeekr 9X': 'zeekr-9x',
  'Zeekr 7X': 'zeekr-7x',
  'Zeekr 7GT': 'zeekr-7gt',
  'Zeekr 001': 'zeekr-001',
  'Zeekr 001 Sport Edition': 'zeekr-001-sport',
  'Zeekr 001 Sportudgave': 'zeekr-001-sport',
  'Zeekr X': 'zeekr-x',
};

function tid(s: string | null): string | null {
  return s ? s.replace(' ', 'T') + '+00:00' : null;
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!process.env.SYNC_TOKEN || token !== process.env.SYNC_TOKEN) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const fejl = db.prepare('select * from fejl order by id').all() as any[];
  const stemmer = db
    .prepare('select fejl_id, ejer_variant from stemmer_log where ejer_variant is not null')
    .all() as any[];
  const komm = db.prepare('select * from kommentarer order by id').all() as any[];

  // variant-fordeling pr. fejl
  const biler = new Map<number, Map<string, number>>();
  for (const s of stemmer) {
    if (!biler.has(s.fejl_id)) biler.set(s.fejl_id, new Map());
    const m = biler.get(s.fejl_id)!;
    m.set(s.ejer_variant, (m.get(s.ejer_variant) ?? 0) + 1);
  }

  // kommentarer pr. fejl
  const kommPr = new Map<number, any[]>();
  for (const k of komm) {
    if (!kommPr.has(k.fejl_id)) kommPr.set(k.fejl_id, []);
    kommPr.get(k.fejl_id)!.push(k);
  }

  const meldinger = fejl.map((f) => {
    let status: string;
    if (f.status === 'Løst!' || f.status === 'Løst') status = 'loest_i_ota';
    else if (f.sidst_sendt_dato) status = 'sendt_til_zeekr';
    else status = STATUS[f.status] ?? 'ny';

    const varianter = [...(biler.get(f.id) ?? new Map()).entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([variant, n]) => ({ variant, n }));

    const kommentarer = (kommPr.get(f.id) ?? []).map((k) => ({
      navn: k.navn,
      tekst: k.tekst,
      is_solution: f.loesning_kommentar_id === k.id,
      created_at: tid(k.oprettet),
    }));

    return {
      legacy_bugherrer_id: f.id,
      type: f.type === 'oenske' ? 'oenske' : 'fejl',
      title: f.titel,
      description: f.beskrivelse,
      status,
      software_version: f.softwareversion ?? null,
      phone_model: f.telefon ?? null,
      phone_os: f.telefon_os ?? null,
      created_at: tid(f.oprettet),
      legacy_stemmer: f.stemmer ?? 0,
      legacy_biler: varianter,
      sidst_sendt_stemmer: f.sidst_sendt_stemmer ?? null,
      sidst_sendt_dato: tid(f.sidst_sendt_dato),
      model_slug: MODEL_SLUG[f.bilmodel] ?? 'zeekr-7gt',
      comments: kommentarer,
    };
  });

  return NextResponse.json({ meldinger, antal: meldinger.length });
}
