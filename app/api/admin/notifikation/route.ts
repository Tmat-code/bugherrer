import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/notifikation?token=XXX
// Beregnet til at blive kaldt af n8n på en tidsplan. Returnerer hvor meget der er
// ulæst siden admin sidst åbnede /admin (admin_sidst_set), så n8n kan sende en mail
// hvis der ligger ulæste henvendelser. Opdaterer IKKE "sidst set" — kun et kig på /admin gør det.
//
// Beskyttet med en delt hemmelighed i NOTIFIKATION_TOKEN. Er den ikke sat, er
// endpointet slået fra.
export async function GET(req: Request) {
  const forventet = process.env.NOTIFIKATION_TOKEN || '';
  if (!forventet) {
    return NextResponse.json({ error: 'Notifikation ikke konfigureret' }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  if (searchParams.get('token') !== forventet) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const sidstSet = queries.hentMeta.get('admin_sidst_set')?.vaerdi ?? null;

  const uuseteHenvendelser = queries.antalHenvendelserSiden.get(sidstSet)!.n;
  const nyeFejl = queries.antalFejlSiden.get(sidstSet)!.n;
  const nyeKommentarer = queries.antalKommentarerSiden.get(sidstSet)!.n;

  let dageSidenAdmin: number | null = null;
  if (sidstSet) {
    const then = new Date(sidstSet.replace(' ', 'T') + 'Z').getTime();
    if (!Number.isNaN(then)) {
      dageSidenAdmin = Math.floor((Date.now() - then) / 86_400_000);
    }
  }

  return NextResponse.json({
    uuseteHenvendelser,
    nyeFejl,
    nyeKommentarer,
    dageSidenAdmin,
    sidstSet,
    // Praktisk flag til n8n: send mail hvis der er ulæste henvendelser.
    boerNotificere: uuseteHenvendelser > 0,
  });
}
