import { NextResponse } from 'next/server';
import { afslutSession } from '@/lib/auth';

export async function POST() {
  afslutSession();
  return NextResponse.json({ ok: true });
}
