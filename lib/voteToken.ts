import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const COOKIE = 'bygherrer_voter';

// Henter (eller opretter) et anonymt token til at forhindre nem dobbelt-stemning.
// Bevidst simpelt: ingen login, ingen personhenfoerbare data — bare et tilfaeldigt id i en cookie.
export function getVoteToken(): string {
  const jar = cookies();
  const eksisterende = jar.get(COOKIE)?.value;
  if (eksisterende) return eksisterende;
  return crypto.randomUUID();
}

export function setVoteTokenCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 * 2, // 2 aar
    path: '/',
  });
}
