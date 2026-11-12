// Resend — transaktionel e-mail via et simpelt HTTPS-kald (ingen SMTP-server).
// Bevidst "graceful": er RESEND_API_KEY ikke sat, er afsendelsen slået FRA, og alt
// andet i appen virker uændret (følg-knappen kan stadig tage imod tilmeldinger — de
// ligger bare i køen, til nøglen kobles på).
//
// Afsender styres af RESEND_FROM (fx "Bugherrer <svar@bugherrer.dk>"). Domænet
// (bugherrer.dk) skal være verificeret i Resend (SPF + DKIM som DNS-records i
// Cloudflare), ellers afviser modtagerne mailen.

import { SITE } from '@/lib/config';

export function resendKonfigureret(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function afsender(): string {
  return process.env.RESEND_FROM || `${SITE.name} <svar@${SITE.domain}>`;
}

export interface SendResultat {
  ok: boolean;
  status: number;
  fejl?: string;
}

// Sender én mail. Kaster ikke — returnerer et resultat, så flush-løkken selv kan
// afgøre om rækken skal blive liggende (og prøves igen) eller markeres sendt.
export async function sendMail(
  til: string,
  emne: string,
  html: string
): Promise<SendResultat> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, status: 0, fejl: 'RESEND_API_KEY ikke sat' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: afsender(), to: til, subject: emne, html }),
    });

    if (res.ok) return { ok: true, status: res.status };

    // Resend giver en JSON-fejl med en besked — tag den med til loggen.
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, status: res.status, fejl: data?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, status: 0, fejl: e instanceof Error ? e.message : 'Ukendt netværksfejl' };
  }
}
