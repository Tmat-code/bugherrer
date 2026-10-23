// Cloudflare Turnstile — usynlig captcha. Verificeres server-side ved submit.
// Bevidst "graceful": hvis TURNSTILE_SECRET_KEY ikke er sat, springes verifikationen
// over, så appen virker både FØR og EFTER du har koblet nøglerne på i Coolify.

// Henter klientens rigtige IP. Bag Cloudflare + tunnel staar den i CF-Connecting-IP.
export function klientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    'ukendt'
  );
}

export async function verificerTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Ingen nøgle sat endnu -> spring over (værnet er "slukket" indtil du kobler det på).
  if (!secret) return true;
  // Nøgle sat, men intet token fra klienten -> afvis.
  if (!token) return false;

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Hvis Cloudflare ikke kan naas, blokér ikke ægte brugere — lad dem igennem.
    return true;
  }
}
