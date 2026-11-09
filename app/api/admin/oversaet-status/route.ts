import { NextResponse } from 'next/server';
import { oversaetDiagnose } from '@/lib/oversaet';
import { erLoggetInd } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/admin/oversaet-status — live-tjek af om LibreTranslate er sat op og svarer.
// Tilgaengelig for alle, der kan eksportere (admin + moderator), saa man kan forstaa,
// hvorfor en rapport evt. ikke blev oversat.
export async function GET() {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }
  const status = await oversaetDiagnose();
  return NextResponse.json(status);
}
