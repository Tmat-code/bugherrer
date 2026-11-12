import { NextResponse } from 'next/server';
import { queries, danRapportMarkering } from '@/lib/db';
import { erAdmin, sessionInfo } from '@/lib/auth';
import { erGyldigRapportType } from '@/lib/rapport-i18n';
import { underretStatus } from '@/lib/notifikationer';

// POST /api/admin/marker-sendt — "Dan Zeekr-rapport": markér de valgte fejl (samme
// udvalg som eksporten) som sendt til Zeekr nu. Gemmer deres nuvaerende stemmetal som
// nulpunkt + et snapshot, saa handlingen kan fortrydes. KUN admin (formand) — committen
// af delta-sporet er formandens ansvar, saa en moderator ikke kan skubbe det skaevt.
export async function POST(req: Request) {
  if (!erAdmin()) {
    return NextResponse.json({ error: 'Kun admin kan danne rapporten' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const antal = body.top === 'alle' ? 1_000_000 : Math.min(Math.max(Number(body.top) || 20, 1), 200);
  const kunAendrede = Boolean(body.kunAendrede);
  const rapportType = erGyldigRapportType(body.type);

  const fejl =
    rapportType === 'begge'
      ? kunAendrede
        ? queries.topFejlKunAendrede.all(antal)
        : queries.topFejl.all(antal)
      : kunAendrede
        ? queries.topFejlKunAendredeType.all(rapportType, antal)
        : queries.topFejlType.all(rapportType, antal);

  if (fejl.length === 0) {
    return NextResponse.json({ error: 'Der er ingen opslag at markere i det valgte udvalg.' }, { status: 400 });
  }

  const s = sessionInfo()!;
  const n = danRapportMarkering(
    fejl.map((f) => ({
      id: f.id,
      sidst_sendt_stemmer: f.sidst_sendt_stemmer,
      sidst_sendt_dato: f.sidst_sendt_dato,
    })),
    s.navn,
    s.rolle
  );

  // Notificér følgere af de tråde, der FØRSTE gang skifter til "Sendt til Zeekr"
  // (dem der aldrig var sendt før). Allerede-sendte skifter ikke status, så de
  // udløser ingen mail. Løste tråde er længere i forløbet og springes over.
  try {
    for (const f of fejl) {
      if (f.sidst_sendt_dato) continue; // var allerede sendt -> ingen statusskift
      const frisk = queries.fejlById.get(f.id);
      if (frisk && !frisk.loest_dato) underretStatus(frisk, 'Sendt til Zeekr');
    }
  } catch (e) {
    console.error('Notifikation (sendt) fejlede:', e);
  }

  return NextResponse.json({ ok: true, antal: n });
}
