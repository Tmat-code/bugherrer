import { NextResponse } from 'next/server';

// Letvaegts health-check til Coolify/Docker.
export async function GET() {
  return NextResponse.json({ status: 'ok', tjeneste: 'bygherrer-listen' });
}
