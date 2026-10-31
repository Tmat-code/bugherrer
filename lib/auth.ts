import { cookies, headers } from 'next/headers';
import crypto from 'node:crypto';

const COOKIE = 'bygherrer_admin';
const SECRET = process.env.SESSION_SECRET || 'usikker-standard-skift-mig';

export type Rolle = 'admin' | 'moderator';

// --- Signering ---
function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

function sikkerLig(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// --- Master-kodeord (formand) ---
export function tjekKodeord(indtastet: string): boolean {
  const korrekt = process.env.ADMIN_PASSWORD || '';
  if (!korrekt) return false;
  const a = Buffer.from(indtastet);
  const b = Buffer.from(korrekt);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Hash af en adgangskode (til DB). Nøglet med SESSION_SECRET, så en DB-læk alene
// ikke afslører koderne.
export function hashAdgangsKode(kode: string): string {
  return crypto.createHmac('sha256', SECRET).update('adgang:' + kode).digest('hex');
}

// --- Session ---
// Token: "<rolle>.<navn-base64url>.<signatur>". Signaturen gør, at cookien kun kan
// laves med den rette SECRET.
export function startSession(rolle: Rolle, navn: string) {
  const navnB64 = Buffer.from(navn).toString('base64url');
  const payload = `${rolle}.${navnB64}`;
  const token = `${payload}.${sign(payload)}`;

  const proto = headers().get('x-forwarded-proto');
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: proto === 'https',
    maxAge: 60 * 60 * 8, // 8 timer
    path: '/',
  });
}

export function afslutSession() {
  cookies().delete(COOKIE);
}

export interface SessionInfo {
  rolle: Rolle;
  navn: string;
}

export function sessionInfo(): SessionInfo | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const dele = token.split('.');
  if (dele.length !== 3) return null;
  const [rolle, navnB64, sig] = dele;
  if (rolle !== 'admin' && rolle !== 'moderator') return null;
  if (!sikkerLig(sign(`${rolle}.${navnB64}`), sig)) return null;
  let navn = '';
  try {
    navn = Buffer.from(navnB64, 'base64url').toString();
  } catch {
    /* ignore */
  }
  return { rolle: rolle as Rolle, navn };
}

export function erLoggetInd(): boolean {
  return sessionInfo() !== null;
}

// Fuld administrator (formand). Moderatorer er logget ind, men ikke admin.
export function erAdmin(): boolean {
  return sessionInfo()?.rolle === 'admin';
}
