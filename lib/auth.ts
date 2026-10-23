import { cookies, headers } from 'next/headers';
import crypto from 'node:crypto';

const COOKIE = 'bygherrer_admin';
const SECRET = process.env.SESSION_SECRET || 'usikker-standard-skift-mig';

// Simpelt, afhaengighedsfrit session-token: HMAC af en fast streng.
// Ingen database-session noedvendig — cookien kan kun laves med den rette SECRET.
function forventetToken(): string {
  return crypto.createHmac('sha256', SECRET).update('admin-logged-in').digest('hex');
}

export function tjekKodeord(indtastet: string): boolean {
  const korrekt = process.env.ADMIN_PASSWORD || '';
  if (!korrekt) return false;
  // Konstant-tids-sammenligning mod timing-angreb.
  const a = Buffer.from(indtastet);
  const b = Buffer.from(korrekt);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function startSession() {
  // Saet kun 'secure' hvis forbindelsen faktisk er HTTPS. Bag en reverse proxy
  // (Traefik/Cloudflare) staar den rigtige protokol i x-forwarded-proto.
  // Saa virker login BAADE over lokal HTTP (fx http://192.168.1.18:3000) OG
  // over HTTPS i produktion — uden at skulle pille ved konfigurationen.
  const proto = headers().get('x-forwarded-proto');
  const erHttps = proto === 'https';
  cookies().set(COOKIE, forventetToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: erHttps,
    maxAge: 60 * 60 * 8, // 8 timer
    path: '/',
  });
}

export function afslutSession() {
  cookies().delete(COOKIE);
}

export function erLoggetInd(): boolean {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return false;
  const forventet = forventetToken();
  const a = Buffer.from(token);
  const b = Buffer.from(forventet);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
