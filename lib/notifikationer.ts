// Notifikations-logik: hvem skal have mail, og hvordan ser den ud.
//
// Hook-stederne (ny kommentar, ny status) kalder underretNyKommentar / underretStatus.
// De slår bekraeftede følgere op og lægger en færdig-renderet mail i køen (outbox).
// Selve afsendelsen sker i flush-endpointet (/api/notifikationer/send), kaldt af n8n.
// Så hook-stederne laver KUN et lokalt SQLite-insert — hurtigt, og kan ikke fejle
// brugerens request eller hænge på et eksternt kald.

import { queries, type Fejl } from '@/lib/db';
import { SITE, beregnStatus, MELDINGSTYPER, type Status } from '@/lib/config';

// --- Links ---
// Base-URL til links i mails. Sæt SITE_URL i Coolify (fx https://bugherrer.dk);
// ellers udledes den af domænet i config.
export function basisUrl(): string {
  return (process.env.SITE_URL || `https://${SITE.domain}`).replace(/\/+$/, '');
}
export const fejlUrl = (id: number) => `${basisUrl()}/fejl/${id}`;
export const bekraeftUrl = (token: string) => `${basisUrl()}/api/foelg/bekraeft?token=${token}`;
export const afmeldUrl = (token: string) => `${basisUrl()}/foelg/afmeld?token=${token}`;

function typeOrd(f: { type: string }) {
  return MELDINGSTYPER[f.type === 'oenske' ? 'oenske' : 'fejl'];
}

// --- Mail-layout ---
// Bevidst enkel, inline-stylet HTML (mail-klienter kan ikke eksterne stylesheets).
// Byggeplads-paletten fra sitet: asfalt (mørk) + hjelm (gul) — ingen grøn/blå.
const FARVE = { moerk: '#1b1f24', gul: '#f4b12a', tekst: '#2b2f36', svag: '#8a9098', kant: '#e6e8eb' };

function layout(opts: { overskrift: string; brødtekst: string; knapTekst?: string; knapUrl?: string; afmeldToken: string }): string {
  const knap =
    opts.knapUrl && opts.knapTekst
      ? `<tr><td style="padding:8px 0 4px;">
           <a href="${opts.knapUrl}" style="display:inline-block;background:${FARVE.gul};color:${FARVE.moerk};
             text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;font-size:15px;">
             ${opts.knapTekst}</a></td></tr>`
      : '';
  return `<!doctype html><html lang="da"><body style="margin:0;background:#f4f5f6;padding:24px 12px;
    font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${FARVE.tekst};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;
      background:#ffffff;border:1px solid ${FARVE.kant};border-radius:12px;overflow:hidden;">
      <tr><td style="background:${FARVE.moerk};padding:16px 24px;">
        <span style="color:#ffffff;font-weight:800;font-size:18px;letter-spacing:.3px;">🔧 ${SITE.name}</span>
        <span style="color:${FARVE.gul};font-weight:700;font-size:13px;"> · ${SITE.domain}</span>
      </td></tr>
      <tr><td style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:19px;color:${FARVE.moerk};">${opts.overskrift}</h1>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:15px;line-height:1.55;">${opts.brødtekst}</td></tr>
          ${knap}
        </table>
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid ${FARVE.kant};font-size:12px;color:${FARVE.svag};line-height:1.5;">
        Du får denne mail, fordi du har valgt at følge en tråd på ${SITE.domain}.
        <a href="${afmeldUrl(opts.afmeldToken)}" style="color:${FARVE.svag};text-decoration:underline;">Afmeld notifikationer for denne tråd</a>.
        <br>${SITE.name} er et uafhængigt ejer-initiativ — ikke tilknyttet ZEEKR, Geely eller deres datterselskaber.
      </td></tr>
    </table>
  </body></html>`;
}

// Fuld HTML-escape (ingen trunkering) — til felter hvor vi vil vise hele teksten.
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function uddrag(s: string, maks = 180): string {
  const t = s.replace(/\s+/g, ' ').trim();
  const e = t.length > maks ? t.slice(0, maks) + '…' : t;
  // Enkel HTML-escape, så en kommentar ikke kan injicere markup i mailen.
  return e.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Bekræft-mail (double opt-in) — bygges af /api/foelg, da den har token'et ---
export function byggBekraeftMail(fejl: Fejl, token: string): { emne: string; html: string } {
  const o = typeOrd(fejl);
  return {
    emne: `Bekræft at du vil følge: ${uddrag(fejl.titel, 60)}`,
    html: layout({
      overskrift: 'Bekræft din tilmelding',
      brødtekst:
        `Du er ved at følge ${o.ikon} <strong>${uddrag(fejl.titel, 120)}</strong>. ` +
        `Klik nedenfor, så får du en mail, hver gang tråden får en ny status eller en ny kommentar. ` +
        `Bad du ikke selv om det, kan du bare ignorere denne mail — så sker der ingenting.`,
      knapTekst: 'Ja, bekræft at jeg vil følge tråden',
      knapUrl: bekraeftUrl(token),
      afmeldToken: token,
    }),
  };
}

// --- Enqueue: ny kommentar ---
export function underretNyKommentar(fejl: Fejl, kommentar: { navn: string; tekst: string }) {
  const foelgere = queries.foelgereForFejl.all(fejl.id);
  if (foelgere.length === 0) return;
  const o = typeOrd(fejl);
  const emne = `Nyt svar: ${uddrag(fejl.titel, 60)}`;
  for (const f of foelgere) {
    const html = layout({
      overskrift: 'Der er kommet et nyt svar',
      brødtekst:
        `${o.ikon} <strong>${uddrag(fejl.titel, 120)}</strong> har fået en ny kommentar fra ` +
        `<strong>${uddrag(kommentar.navn, 40)}</strong>:<br><br>` +
        `<span style="display:block;border-left:3px solid ${FARVE.gul};padding:4px 0 4px 12px;color:${FARVE.tekst};">` +
        `${uddrag(kommentar.tekst, 300)}</span>`,
      knapTekst: 'Læs og svar på tråden',
      knapUrl: fejlUrl(fejl.id),
      afmeldToken: f.token,
    });
    queries.koeMail.run({ email: f.email, emne, html });
  }
}

// --- Enqueue: ny status ---
const STATUS_BESKED: Record<Status, string> = {
  'Undersøges': 'er registreret og samler nu stemmer',
  'Bekræftet': 'er nu bekræftet af nok ejere — den regnes som et reelt, udbredt problem',
  'Sendt til Zeekr': 'er sendt videre til Zeekr i en samlet rapport',
  'Løst!': 'er markeret som løst — Zeekr skulle have fikset den',
};

export function underretStatus(fejl: Fejl, status: Status) {
  const foelgere = queries.foelgereForFejl.all(fejl.id);
  if (foelgere.length === 0) return;
  const o = typeOrd(fejl);
  const emne = `Ny status (${status}): ${uddrag(fejl.titel, 55)}`;
  for (const f of foelgere) {
    const html = layout({
      overskrift: `Ny status: ${status}`,
      brødtekst:
        `${o.ikon} <strong>${uddrag(fejl.titel, 120)}</strong> ${STATUS_BESKED[status]}.`,
      knapTekst: 'Se tråden',
      knapUrl: fejlUrl(fejl.id),
      afmeldToken: f.token,
    });
    queries.koeMail.run({ email: f.email, emne, html });
  }
}

// Hjælper til hook-stederne: udregn den aktuelle (udledte) status for en fejl.
export function aktuelStatus(fejl: Fejl): Status {
  return beregnStatus({
    loest_dato: fejl.loest_dato,
    sidst_sendt_dato: fejl.sidst_sendt_dato,
    bekraeftedeBiler: queries.antalEjerBekraeftet.get(fejl.id)!.n,
  });
}

// --- Enqueue: ny henvendelse via kontaktformularen → mail til formanden ---
// Lægger EN mail i udbakken i samme sekund en henvendelse kommer ind, så formanden
// får SELVE beskeden (navn, e-mail, tekst) med det samme — ikke et tal én gang om
// dagen, og uden at skulle ind på /admin. Samme robuste vej som følg-mails: den
// lægges bare i køen (hurtigt, lokalt), og flush-endpointet sender den via Resend.
//
// Modtageren sættes i FORMAND_EMAIL (Coolify). Er den ikke sat, gør funktionen
// INGENTING — henvendelsen er stadig gemt, og alt andet virker uændret.
export function underretFormandOmHenvendelse(h: { navn: string; email: string; besked: string }) {
  const til = (process.env.FORMAND_EMAIL || '').trim();
  if (!til) return;

  const navnRaw = h.navn.trim();
  const navn = navnRaw || 'Anonym';
  const svarTil = h.email.trim();

  const emne = `📨 Ny henvendelse på ${SITE.name}${navnRaw ? ` fra ${navnRaw.slice(0, 40)}` : ''}`;

  const kontaktRaekke = svarTil
    ? `<strong>Svar til:</strong> <a href="mailto:${esc(svarTil)}" style="color:${FARVE.moerk};">${esc(svarTil)}</a>`
    : `<span style="color:${FARVE.svag};">Ingen e-mail oplyst — du kan kun svare her på sitet.</span>`;

  const html = `<!doctype html><html lang="da"><body style="margin:0;background:#f4f5f6;padding:24px 12px;
    font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${FARVE.tekst};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;
      background:#ffffff;border:1px solid ${FARVE.kant};border-radius:12px;overflow:hidden;">
      <tr><td style="background:${FARVE.moerk};padding:16px 24px;">
        <span style="color:#ffffff;font-weight:800;font-size:18px;letter-spacing:.3px;">🔧 ${SITE.name}</span>
        <span style="color:${FARVE.gul};font-weight:700;font-size:13px;"> · ny henvendelse</span>
      </td></tr>
      <tr><td style="padding:24px;">
        <h1 style="margin:0 0 4px;font-size:19px;color:${FARVE.moerk};">Ny henvendelse fra ${esc(navn)}</h1>
        <p style="margin:0 0 14px;font-size:14px;">${kontaktRaekke}</p>
        <div style="border-left:3px solid ${FARVE.gul};padding:8px 0 8px 14px;font-size:15px;line-height:1.55;
          white-space:pre-wrap;color:${FARVE.tekst};">${esc(h.besked.trim())}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;"><tr><td>
          <a href="${basisUrl()}/admin" style="display:inline-block;background:${FARVE.gul};color:${FARVE.moerk};
            text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;font-size:15px;">
            Åbn indbakken i admin</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid ${FARVE.kant};font-size:12px;color:${FARVE.svag};line-height:1.5;">
        Sendt automatisk, fordi nogen skrev via kontaktformularen på ${SITE.domain}.
      </td></tr>
    </table>
  </body></html>`;

  queries.koeMail.run({ email: til, emne, html });
}
