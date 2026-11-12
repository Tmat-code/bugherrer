import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { getVoteToken, setVoteTokenCookie } from '@/lib/voteToken';
import { ZEEKR_VARIANTER, BEKRAEFT_TAERSKEL } from '@/lib/config';
import { klientIp } from '@/lib/turnstile';
import { tilladt } from '@/lib/ratelimit';
import { underretStatus } from '@/lib/notifikationer';

const BEKR_MAKS = 60;
const BEKR_VINDUE = 10 * 60 * 1000;

// POST /api/bekraeft-ejer  { fejlId, variant }
// Markerer den aktuelle browsers stemme som "bil-bekraeftet" med en 7GT-variant.
// Kraever at browseren allerede har stemt paa fejlen (der skal findes en stemmer_log-raekke).
// Gemmer KUN variant-navnet — ingen VIN, intet personhenfoerbart.
export async function POST(req: Request) {
  const ip = klientIp(req);
  if (!tilladt(`bekraeft:${ip}`, BEKR_MAKS, BEKR_VINDUE)) {
    return NextResponse.json(
      { error: 'For mange bekræftelser på kort tid. Vent et øjeblik og prøv igen.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const id = Number(body?.fejlId);
  const variant = String(body?.variant || '');

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Ugyldigt fejl-id' }, { status: 400 });
  }
  if (!(ZEEKR_VARIANTER as readonly string[]).includes(variant)) {
    return NextResponse.json({ error: 'Ukendt variant' }, { status: 400 });
  }
  const fejl = queries.fejlById.get(id);
  if (!fejl) {
    return NextResponse.json({ error: 'Bugherren findes ikke' }, { status: 404 });
  }

  const token = getVoteToken();
  const res = queries.bekraeftEjer.run({ fejlId: id, token, variant });
  setVoteTokenCookie(token);

  // .changes === 0: browseren har ikke stemt paa fejlen endnu.
  if (res.changes === 0) {
    return NextResponse.json(
      { error: 'Stem på fejlen først, så kan du bekræfte ejerskab.' },
      { status: 409 }
    );
  }

  const antal = queries.antalEjerBekraeftet.get(id)!.n;

  // Lige krydset tærsklen -> status bliver "Bekræftet". Notificér følgere (én gang:
  // kun når antal rammer tærsklen præcist), og kun hvis fejlen ikke allerede er
  // længere i forløbet (sendt/løst).
  if (antal === BEKRAEFT_TAERSKEL && !fejl.sidst_sendt_dato && !fejl.loest_dato) {
    try {
      underretStatus(fejl, 'Bekræftet');
    } catch (e) {
      console.error('Notifikation (bekræftet) fejlede:', e);
    }
  }

  return NextResponse.json({ ok: true, antal });
}
