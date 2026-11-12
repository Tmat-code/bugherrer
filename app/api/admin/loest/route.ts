import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import { underretStatus } from '@/lib/notifikationer';

// POST /api/admin/loest  { id, loest: boolean }
// Det eneste manuelle status-felt: markér en fejl som løst (Zeekr har fikset den),
// eller genåbn den. Resten af statusserne udledes automatisk. Admin + moderator.
export async function POST(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const { id, loest } = await req.json().catch(() => ({}));
  const fejlId = Number(id);
  if (!Number.isInteger(fejlId)) {
    return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
  }
  const foer = queries.fejlById.get(fejlId);
  if (loest) queries.markerLoest.run(fejlId);
  else queries.genaabnFejl.run(fejlId);

  // Notificér følgere, når en tråd FØRSTE gang markeres løst (ikke ved genåbn, og
  // ikke hvis den allerede var løst).
  if (loest && foer && !foer.loest_dato) {
    try {
      const frisk = queries.fejlById.get(fejlId);
      if (frisk) underretStatus(frisk, 'Løst!');
    } catch (e) {
      console.error('Notifikation (løst) fejlede:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
