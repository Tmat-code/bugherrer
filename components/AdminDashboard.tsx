'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Fejl, FejlMedSvar } from '@/lib/db';
import { beregnStatus } from '@/lib/config';
import { relativTid } from '@/lib/tid';
import StatusTag from '@/components/StatusTag';

export interface AktivitetItem {
  slags: 'fejl' | 'kommentar';
  id: number;
  fejlId: number;
  titel: string;
  navn?: string;
  uddrag?: string;
  oprettet: string;
  ny: boolean;
}

export interface HenvendelseItem {
  id: number;
  navn: string;
  email: string;
  besked: string;
  oprettet: string;
  ny: boolean;
}

export interface Overblik {
  totalFejl: number;
  totalKommentarer: number;
  nyeFejl: number;
  nyeKommentarer: number;
  totalHenvendelser: number;
  nyeHenvendelser: number;
  henvendelser: HenvendelseItem[];
  sidstSet: string | null;
  aktivitet: AktivitetItem[];
}

export interface AdgangItem {
  id: number;
  navn: string;
  rolle: string;
  aktiv: boolean;
  oprettet: string;
  sidstBrugt: string | null;
}

export interface InvitationItem {
  id: number;
  navn: string;
  rolle: string;
  token: string;
  oprettet: string;
}

export interface RapportLogItem {
  navn: string;
  rolle: string;
  format: string;
  type: string;
  antal: string;
  kunAendrede: boolean;
  medKommentarer: boolean;
  oprettet: string;
}

export interface SidstSendt {
  navn: string;
  rolle: string;
  antal: number;
  oprettet: string;
}

// Eksakt dato + klokkeslæt i dansk tid.
function dkTidspunkt(utc: string): string {
  const d = new Date(utc.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return utc;
  return d.toLocaleString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_LABEL: Record<string, string> = {
  fejl: 'Fejl',
  oenske: 'Ønsker',
  begge: 'Begge',
};

export default function AdminDashboard({
  fejl,
  overblik,
  erAdmin,
  session,
  adgange,
  invitationer,
  rapportLog,
  sidstSendt,
  forsideBesked,
  forsideBeskedAktiv,
  sidenSidst,
  aendredeListe,
}: {
  fejl: FejlMedSvar[];
  overblik: Overblik;
  erAdmin: boolean;
  session: { navn: string; rolle: string };
  adgange: AdgangItem[];
  invitationer: InvitationItem[];
  rapportLog: RapportLogItem[];
  sidstSendt: SidstSendt | null;
  forsideBesked: string;
  forsideBeskedAktiv: boolean;
  sidenSidst: { nye: number; eskaleret: number; ekstra_stemmer: number };
  aendredeListe: { id: number; titel: string; stemmer: number; nySidenSidst: boolean; vaekst: number }[];
}) {
  const router = useRouter();
  const [top, setTop] = useState<number | 'alle'>(20);
  const [sprog, setSprog] = useState('da');
  const [kunAendrede, setKunAendrede] = useState(false);
  const [medKommentarer, setMedKommentarer] = useState(false);
  const [rapportType, setRapportType] = useState<'fejl' | 'oenske' | 'begge'>('fejl');
  const [danTravl, setDanTravl] = useState(false);
  const [fortrydTravl, setFortrydTravl] = useState(false);
  const [visDanRapport, setVisDanRapport] = useState(false);
  const [danBekraeft, setDanBekraeft] = useState('');
  const [oversTravl, setOversTravl] = useState(false);
  const [oversStatus, setOversStatus] = useState<null | {
    konfigureret: boolean;
    vaert: string | null;
    ok: boolean;
    prove?: { kilde: string; resultat: string };
    fejl?: string;
  }>(null);
  const [beskedTekst, setBeskedTekst] = useState(forsideBesked);
  const [beskedAktiv, setBeskedAktiv] = useState(forsideBeskedAktiv);
  const [beskedTravl, setBeskedTravl] = useState(false);
  const [travl, setTravl] = useState<number | null>(null);
  const [henvTravl, setHenvTravl] = useState<number | null>(null);
  const [redigerer, setRedigerer] = useState<Fejl | null>(null);
  const [invNavn, setInvNavn] = useState('');
  const [invRolle, setInvRolle] = useState<'moderator' | 'admin'>('moderator');
  const [invTravl, setInvTravl] = useState(false);

  async function toggleLoest(id: number, loest: boolean) {
    setTravl(id);
    try {
      await fetch('/api/admin/loest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, loest }),
      });
      router.refresh();
    } finally {
      setTravl(null);
    }
  }

  async function slet(id: number, titel: string) {
    if (!confirm(`Slet bugherren "${titel}" permanent? Dette kan ikke fortrydes.`)) return;
    setTravl(id);
    try {
      await fetch('/api/admin/slet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setTravl(null);
    }
  }

  // Fælles URL til eksport/forhåndsvisning — samme udvalg bruges til den officielle rapport.
  function eksportUrl(format: 'pdf' | 'csv') {
    const sti = format === 'csv' ? '/api/admin/export/csv' : '/api/admin/export';
    return `${sti}?top=${top}&sprog=${sprog}&type=${rapportType}${kunAendrede ? '&kunAendrede=1' : ''}${medKommentarer ? '&kommentarer=1' : ''}`;
  }

  // "Dan Zeekr-rapport": hent PDF'en FØRST (så filen er i hånden), markér derefter alt
  // som sendt. Rækkefølgen sikrer, at vi aldrig markerer uden at du har fået filen.
  async function danRapport() {
    setDanTravl(true);
    try {
      const pdfRes = await fetch(eksportUrl('pdf'));
      if (!pdfRes.ok) {
        alert('Kunne ikke danne PDF’en — intet blev markeret. Prøv igen.');
        return;
      }
      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bugherrer-zeekr-rapport-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const res = await fetch('/api/admin/marker-sendt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top, kunAendrede, type: rapportType }),
      });
      const data = await res.json();
      if (res.ok) {
        setVisDanRapport(false);
        setDanBekraeft('');
        alert(`✅ Rapport dannet. ${data.antal} opslag markeret som sendt til Zeekr.`);
        router.refresh();
      } else {
        alert((data.error || 'Markering gik galt.') + '\n\n(PDF’en er hentet, men INTET er markeret som sendt.)');
      }
    } finally {
      setDanTravl(false);
    }
  }

  async function gemBesked(aktiv: boolean) {
    setBeskedTravl(true);
    try {
      await fetch('/api/admin/forside-besked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tekst: beskedTekst, aktiv }),
      });
      setBeskedAktiv(aktiv);
      router.refresh();
    } finally {
      setBeskedTravl(false);
    }
  }

  async function testOversaettelse() {
    setOversTravl(true);
    try {
      const res = await fetch('/api/admin/oversaet-status');
      const data = await res.json();
      if (res.ok) setOversStatus(data);
      else {
        setOversStatus(null);
        alert(data.error || 'Kunne ikke hente status.');
      }
    } finally {
      setOversTravl(false);
    }
  }

  async function fortrydMarkering() {
    if (
      !confirm(
        'Fortryd den seneste dan-rapport?\n\nOpslagenes NY / +N-markører rulles tilbage, som om rapporten aldrig blev sendt. Brug det, hvis du kom til at danne rapporten uden at sende den.'
      )
    )
      return;
    setFortrydTravl(true);
    try {
      const res = await fetch('/api/admin/fortryd-markering', { method: 'POST' });
      const data = await res.json();
      alert(res.ok ? `↩️ Fortrudt. ${data.antal} opslag rullet tilbage.` : data.error || 'Kunne ikke fortryde.');
      router.refresh();
    } finally {
      setFortrydTravl(false);
    }
  }

  async function sletHenvendelse(id: number) {
    if (!confirm('Slet denne henvendelse permanent? Dette kan ikke fortrydes.')) return;
    setHenvTravl(id);
    try {
      await fetch('/api/admin/slet-henvendelse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setHenvTravl(null);
    }
  }

  async function logUd() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  function kopierLink(token: string) {
    const link = `${window.location.origin}/tilmeld?token=${token}`;
    try {
      navigator.clipboard?.writeText(link);
    } catch {
      /* ignore */
    }
    alert('Invitations-link kopieret — send det til personen:\n\n' + link);
  }

  async function opretInvitation() {
    if (!invNavn.trim()) {
      alert('Angiv et navn.');
      return;
    }
    setInvTravl(true);
    try {
      const res = await fetch('/api/admin/adgang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handling: 'inviter', navn: invNavn.trim(), rolle: invRolle }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        kopierLink(data.token);
        setInvNavn('');
        router.refresh();
      } else {
        alert(data.error || 'Noget gik galt.');
      }
    } finally {
      setInvTravl(false);
    }
  }

  async function adgangHandling(body: Record<string, unknown>) {
    await fetch('/api/admin/adgang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function nulstilAdgang(id: number, navn: string) {
    if (
      !confirm(
        `Lav et nyt kodeord-link til ${navn}?\n\n` +
          'Deres nuværende kodeord erstattes, når de vælger et nyt via linket.'
      )
    )
      return;
    const res = await fetch('/api/admin/adgang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handling: 'nulstil', id }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      kopierLink(data.token);
      router.refresh();
    } else {
      alert(data.error || 'Noget gik galt.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-asfalt-900">
            🏗️ Byggeledelse
          </h1>
          <p className="text-sm text-asfalt-500">
            Logget ind som <strong>{session.navn}</strong>{' '}
            <span className="rounded bg-asfalt-100 px-1.5 py-0.5 text-xs font-bold text-asfalt-600">
              {erAdmin ? 'admin' : 'moderator'}
            </span>{' '}
            · {fejl.length} meldinger
          </p>
        </div>
        <div className="flex items-center gap-2">
          {erAdmin && (
            <a href="/admin/statistik" className="btn-ghost text-sm">📈 Aktivitet</a>
          )}
          <button onClick={logUd} className="btn-ghost text-sm">Log ud</button>
        </div>
      </div>

      {/* Overblik */}
      <section className="kort mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-asfalt-900">📊 Overblik</h2>
          <p className="text-sm text-asfalt-500">
            {overblik.sidstSet
              ? overblik.nyeHenvendelser + overblik.nyeFejl + overblik.nyeKommentarer > 0
                ? `Siden sidst: ${overblik.nyeHenvendelser} henvendelser · ${overblik.nyeFejl} nye bugherrer · ${overblik.nyeKommentarer} nye svar`
                : 'Intet nyt siden du sidst var her ✅'
              : 'Velkommen — her er dit overblik'}
          </p>
        </div>

        {/* Nøgletal */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile tal={overblik.totalFejl} tekst="Bugherrer i alt" ikon="🛠️" />
          <StatTile tal={overblik.totalKommentarer} tekst="Svar i alt" ikon="💬" />
          <StatTile
            tal={overblik.nyeHenvendelser}
            tekst="Nye henvendelser"
            ikon="📨"
            fremhaev={overblik.nyeHenvendelser > 0}
          />
          <StatTile
            tal={overblik.nyeFejl + overblik.nyeKommentarer}
            tekst="Ny aktivitet siden sidst"
            ikon="🔔"
            fremhaev={overblik.nyeFejl + overblik.nyeKommentarer > 0}
          />
        </div>

        {/* Aktivitetsfeed */}
        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-asfalt-400">
          Seneste aktivitet
        </h3>
        <ul className="mt-3 space-y-2">
          {overblik.aktivitet.length === 0 && (
            <li className="rounded-md bg-asfalt-50 p-4 text-sm text-asfalt-500">
              Der er ikke kommet noget ind endnu.
            </li>
          )}
          {overblik.aktivitet.map((a) => (
            <li key={`${a.slags}-${a.id}`}>
              <a
                href={`/fejl/${a.fejlId}`}
                className={`flex items-start gap-3 rounded-md border-2 p-3 transition-colors hover:border-hjelm-400 ${
                  a.ny ? 'border-hjelm-500 bg-hjelm-50' : 'border-transparent bg-white'
                }`}
              >
                <span className="text-lg" aria-hidden>
                  {a.slags === 'fejl' ? '🛠️' : '💬'}
                </span>
                <span className="min-w-0 flex-1">
                  {a.slags === 'fejl' ? (
                    <span className="text-asfalt-800">
                      Ny bugherre meldt: <span className="font-bold">{a.titel}</span>
                    </span>
                  ) : (
                    <span className="text-asfalt-800">
                      <span className="font-bold">{a.navn}</span> svarede på{' '}
                      <span className="font-bold">{a.titel}</span>
                      {a.uddrag && (
                        <span className="text-asfalt-500"> — &ldquo;{a.uddrag}&rdquo;</span>
                      )}
                    </span>
                  )}
                  <span className="mt-0.5 block text-xs text-asfalt-400">
                    🕑 {relativTid(a.oprettet)}
                  </span>
                </span>
                {a.ny && (
                  <span className="shrink-0 rounded bg-hjelm-500 px-2 py-0.5 text-xs font-black text-asfalt-900">
                    NY
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Henvendelser (kontaktformular) */}
      <section className="kort mt-6 p-6">
        <h2 className="text-lg font-bold text-asfalt-900">📨 Henvendelser</h2>
        <p className="mt-1 text-sm text-asfalt-500">Beskeder fra kontaktformularen.</p>
        <ul className="mt-4 space-y-3">
          {overblik.henvendelser.length === 0 && (
            <li className="rounded-md bg-asfalt-50 p-4 text-sm text-asfalt-500">
              Ingen henvendelser endnu.
            </li>
          )}
          {overblik.henvendelser.map((h) => (
            <li
              key={h.id}
              className={`rounded-md border-2 p-4 ${
                h.ny ? 'border-hjelm-500 bg-hjelm-50' : 'border-asfalt-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-asfalt-800">
                  {h.navn || 'Anonym'}
                  {h.email && (
                    <a
                      href={`mailto:${h.email}`}
                      className="ml-2 text-sm font-normal text-hjelm-700 hover:underline"
                    >
                      {h.email}
                    </a>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs text-asfalt-400">
                  🕑 {relativTid(h.oprettet)}
                  {h.ny && (
                    <span className="rounded bg-hjelm-500 px-2 py-0.5 font-black text-asfalt-900">
                      NY
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-asfalt-700">{h.besked}</p>
              <div className="mt-2 flex items-center gap-4">
                {h.email && (
                  <a
                    href={`mailto:${h.email}?subject=Svar fra Bugherrer`}
                    className="text-xs font-bold text-green-700 hover:underline"
                  >
                    ↩︎ Svar på mail
                  </a>
                )}
                <button
                  onClick={() => sletHenvendelse(h.id)}
                  disabled={henvTravl === h.id}
                  className="text-xs font-bold text-murstensroed hover:underline"
                >
                  🗑️ Slet
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Eksport-panel (admin + moderator) */}
      <div className="kort mt-6 p-6">
        <h2 className="text-lg font-bold text-asfalt-900">📤 Eksport til Zeekr-importør</h2>
        <p className="mt-1 text-sm text-asfalt-500">
          <strong>Forhåndsvisning</strong> henter en rapport uden at ændre noget — kig så
          meget du vil. Den <strong>officielle</strong> rapport (nederst, kun admin) markerer
          samtidig alt som sendt til Zeekr.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="top" className="label">Antal (top)</label>
            <select
              id="top"
              value={top}
              onChange={(e) => setTop(e.target.value === 'alle' ? 'alle' : Number(e.target.value))}
              className="input !w-28"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value="alle">Alle</option>
            </select>
          </div>
          <div>
            <label htmlFor="rapporttype" className="label">Indhold</label>
            <select
              id="rapporttype"
              value={rapportType}
              onChange={(e) => setRapportType(e.target.value as 'fejl' | 'oenske' | 'begge')}
              className="input !w-36"
            >
              <option value="fejl">🛠️ Fejl</option>
              <option value="oenske">💡 Ønsker</option>
              <option value="begge">Begge</option>
            </select>
          </div>
          <div>
            <label htmlFor="sprog" className="label">Sprog</label>
            <select
              id="sprog"
              value={sprog}
              onChange={(e) => setSprog(e.target.value)}
              className="input !w-36"
            >
              <option value="da">🇩🇰 Dansk</option>
              <option value="en">🇬🇧 English</option>
              <option value="sv">🇸🇪 Svenska</option>
            </select>
          </div>
          <a href={eksportUrl('pdf')} className="btn-secondary">
            📄 Forhåndsvis PDF
          </a>
          <a href={eksportUrl('csv')} className="btn-secondary">
            📊 Forhåndsvis CSV
          </a>
        </div>

        {/* Inkludér kommentarer */}
        <label className="mt-3 flex items-start gap-2 text-sm font-bold text-asfalt-800">
          <input
            type="checkbox"
            checked={medKommentarer}
            onChange={(e) => setMedKommentarer(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Inkludér kommentarer
            <span className="block text-xs font-normal text-asfalt-500">
              Tager ejernes kommentarer med under hver fejl (den markerede løsning udelades —
              Zeekr skal have fejlen, ikke workaround&apos;en).
            </span>
          </span>
        </label>

        {/* Eskalerings-filter */}
        <div className="mt-4 rounded-lg border-2 border-asfalt-200 bg-asfalt-50 p-4">
          <label className="flex items-start gap-2 text-sm font-bold text-asfalt-800">
            <input
              type="checkbox"
              checked={kunAendrede}
              onChange={(e) => setKunAendrede(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            Kun nye + eskalerende
          </label>
          <p className="mt-1 text-xs text-asfalt-500">
            Tager kun fejl med, der aldrig er sendt før, eller som har fået flere stemmer
            siden sidst de blev sendt. Rapporten viser <strong>NY</strong> eller{' '}
            <strong>+N siden sidst</strong>, så Zeekr kan se, hvad der eskalerer.
          </p>
        </div>

        {/* Sidst sendt — vises for alle */}
        {sidstSendt && (
          <p className="mt-4 text-sm text-asfalt-600">
            📨 Sidst sendt til Zeekr:{' '}
            <strong>{dkTidspunkt(sidstSendt.oprettet)}</strong> af {sidstSendt.navn} ·{' '}
            {sidstSendt.antal} opslag
          </p>
        )}

        {/* Dan den officielle rapport (markér sendt) — KUN admin */}
        {erAdmin ? (
          <div className="mt-3 rounded-lg border-2 border-hjelm-500 bg-hjelm-50 p-4">
            <h3 className="text-sm font-black text-asfalt-900">
              📤 Dan Zeekr-rapport (officiel — markerer som sendt)
            </h3>
            <p className="mt-1 text-xs text-asfalt-600">
              Henter PDF&apos;en <strong>og</strong> markerer hele udvalget som sendt til Zeekr i
              ét hug. Gør det kun, når du faktisk sender rapporten nu.
            </p>

            {!visDanRapport ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setVisDanRapport(true)} className="btn-primary text-sm">
                  📤 Dan Zeekr-rapport…
                </button>
                {sidstSendt && (
                  <button
                    onClick={fortrydMarkering}
                    disabled={fortrydTravl}
                    className="btn-ghost text-sm"
                  >
                    {fortrydTravl ? 'Fortryder…' : '↩️ Fortryd sidste'}
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border-2 border-murstensroed/50 bg-white p-3">
                <p className="text-sm font-bold text-murstensroed">⚠️ Sidste advarsel</p>
                <p className="mt-1 text-xs text-asfalt-600">
                  Alle opslag i{' '}
                  <strong>{top === 'alle' ? 'hele listen' : 'top ' + top}</strong>
                  {kunAendrede ? ' (nye + eskalerende)' : ''} markeres som{' '}
                  <strong>sendt til Zeekr</strong>. Hvis rapporten ikke rent faktisk sendes,
                  tror systemet alligevel, at Zeekr har set dem — og de kommer ikke med som nye
                  næste gang. (Du kan fortryde bagefter med &quot;Fortryd sidste&quot;.)
                </p>
                <label htmlFor="danbekraeft" className="mt-3 block text-xs font-bold text-asfalt-700">
                  Skriv <code>Dan rapport</code> for at låse op:
                </label>
                <input
                  id="danbekraeft"
                  value={danBekraeft}
                  onChange={(e) => setDanBekraeft(e.target.value)}
                  placeholder="Dan rapport"
                  autoComplete="off"
                  className="input mt-1 !w-56"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={danRapport}
                    disabled={danTravl || danBekraeft.trim().toLowerCase() !== 'dan rapport'}
                    className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {danTravl ? 'Danner…' : '📤 Dan rapport & markér sendt'}
                  </button>
                  <button
                    onClick={() => {
                      setVisDanRapport(false);
                      setDanBekraeft('');
                    }}
                    className="btn-ghost text-sm"
                  >
                    Annullér
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-asfalt-400">
            Kun formanden (admin) kan danne den officielle rapport og markere som sendt. Du kan
            forhåndsvise ovenfor.
          </p>
        )}

        {sprog !== 'da' && (
          <p className="mt-3 text-xs text-asfalt-500">
            💡 Fejl-teksten oversættes via LibreTranslate (kræver{' '}
            <code>LIBRETRANSLATE_URL</code>). Uden den er rammen på det valgte sprog, men
            fejl-teksten forbliver dansk.
          </p>
        )}

        {/* Live-tjek af oversættelsen */}
        <div className="mt-3">
          <button onClick={testOversaettelse} disabled={oversTravl} className="btn-ghost text-sm">
            {oversTravl ? 'Tester…' : '🔎 Test oversættelse'}
          </button>
          {oversStatus && (
            <div
              className={`mt-2 rounded-lg border-2 p-3 text-sm ${
                !oversStatus.konfigureret
                  ? 'border-hjelm-500 bg-hjelm-50'
                  : oversStatus.ok
                    ? 'border-green-600 bg-green-50'
                    : 'border-murstensroed/60 bg-white'
              }`}
            >
              {!oversStatus.konfigureret ? (
                <p className="text-asfalt-700">
                  ⚠️ <strong>LibreTranslate er ikke sat op.</strong> <code>LIBRETRANSLATE_URL</code>{' '}
                  mangler på appen, så rapporter oversættes ikke — fejl-teksten forbliver dansk. Sæt
                  den i Coolify og redeploy.
                </p>
              ) : oversStatus.ok ? (
                <p className="text-asfalt-700">
                  ✅ <strong>Oversættelse virker</strong> (via {oversStatus.vaert}).<br />
                  Prøve: «{oversStatus.prove?.kilde}» → «<strong>{oversStatus.prove?.resultat}</strong>»
                </p>
              ) : (
                <p className="text-asfalt-700">
                  ❌ <strong>Kan ikke nå LibreTranslate</strong> på {oversStatus.vaert}.<br />
                  <span className="font-mono text-xs text-murstensroed">{oversStatus.fejl}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Siden sidste rapport — opfølgnings-overblik */}
      <section className="kort mt-6 p-6">
        <h2 className="text-lg font-bold text-asfalt-900">📈 Siden sidste rapport</h2>
        <p className="mt-1 text-sm text-asfalt-500">
          {sidstSendt
            ? `Sidst sendt til Zeekr ${dkTidspunkt(sidstSendt.oprettet)} af ${sidstSendt.navn}. Herunder er det, der er kommet til siden.`
            : 'Du har ikke sendt en rapport til Zeekr endnu — så alt herunder tæller som nyt.'}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border-2 border-asfalt-200 p-3">
            <div className="text-2xl font-black text-asfalt-900">{sidenSidst.nye}</div>
            <div className="text-xs font-bold text-asfalt-500">helt nye fejl</div>
          </div>
          <div className="rounded-lg border-2 border-asfalt-200 p-3">
            <div className="text-2xl font-black text-asfalt-900">{sidenSidst.eskaleret}</div>
            <div className="text-xs font-bold text-asfalt-500">med flere stemmer</div>
          </div>
          <div className="rounded-lg border-2 border-asfalt-200 p-3">
            <div className="text-2xl font-black text-asfalt-900">+{sidenSidst.ekstra_stemmer}</div>
            <div className="text-xs font-bold text-asfalt-500">nye stemmer i alt</div>
          </div>
        </div>

        {aendredeListe.length === 0 ? (
          <p className="mt-4 rounded-md bg-green-50 p-3 text-sm font-bold text-asfalt-700">
            ✅ Intet nyt siden sidste rapport.
          </p>
        ) : (
          <ul className="mt-4 space-y-1">
            {aendredeListe.slice(0, 15).map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                {f.nySidenSidst ? (
                  <span className="shrink-0 rounded bg-hjelm-400 px-1.5 py-0.5 text-xs font-black text-asfalt-900">
                    NY
                  </span>
                ) : (
                  <span className="shrink-0 rounded bg-asfalt-800 px-1.5 py-0.5 text-xs font-black text-hjelm-300">
                    +{f.vaekst}
                  </span>
                )}
                <a href={`/fejl/${f.id}`} className="truncate font-bold text-asfalt-800 hover:text-hjelm-700">
                  {f.titel}
                </a>
                <span className="ml-auto shrink-0 text-xs text-asfalt-400">▲ {f.stemmer}</span>
              </li>
            ))}
            {aendredeListe.length > 15 && (
              <li className="text-xs text-asfalt-400">… og {aendredeListe.length - 15} flere</li>
            )}
          </ul>
        )}
      </section>

      {/* Forside-besked (kun admin) */}
      {erAdmin && (
        <section className="kort mt-6 p-6">
          <h2 className="text-lg font-bold text-asfalt-900">📣 Forside-besked</h2>
          <p className="mt-1 text-sm text-asfalt-500">
            En besked, der vises øverst på forsiden — fx når du har sendt en rapport til Zeekr.
            Tænd den med ét klik, og sluk igen når den ikke er aktuel.
          </p>
          <textarea
            value={beskedTekst}
            onChange={(e) => setBeskedTekst(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Vi har sendt vores første samlede rapport til Zeekr support 🎉 Tak for alle meldinger!"
            className="mt-3 w-full rounded-lg border-2 border-asfalt-200 p-3 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {beskedAktiv ? (
              <>
                <span className="rounded-full bg-graes px-2.5 py-0.5 text-xs font-bold text-white">
                  ● Vises på forsiden nu
                </span>
                <button onClick={() => gemBesked(true)} disabled={beskedTravl} className="btn-secondary text-sm">
                  {beskedTravl ? 'Gemmer…' : 'Gem ændringer'}
                </button>
                <button onClick={() => gemBesked(false)} disabled={beskedTravl} className="btn-ghost text-sm">
                  Sluk
                </button>
              </>
            ) : (
              <button
                onClick={() => gemBesked(true)}
                disabled={beskedTravl || !beskedTekst.trim()}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {beskedTravl ? 'Tænder…' : '📣 Vis på forsiden'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Adgange & invitationer (kun admin) */}
      {erAdmin && (
        <section className="kort mt-6 p-6">
          <h2 className="text-lg font-bold text-asfalt-900">👥 Adgange</h2>
          <p className="mt-1 text-sm text-asfalt-500">
            Giv andre adgang til at administrere. Opret en invitation, kopiér linket og send
            det — personen vælger selv sit kodeord. Dit eget kodeord er altid admin.
          </p>

          {/* Opret invitation */}
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border-2 border-asfalt-200 bg-asfalt-50 p-4">
            <div>
              <label className="label" htmlFor="inv-navn">Navn</label>
              <input
                id="inv-navn"
                value={invNavn}
                onChange={(e) => setInvNavn(e.target.value)}
                placeholder="Fx Mette"
                className="input !w-44"
                maxLength={40}
              />
            </div>
            <div>
              <label className="label" htmlFor="inv-rolle">Rolle</label>
              <select
                id="inv-rolle"
                value={invRolle}
                onChange={(e) => setInvRolle(e.target.value as 'moderator' | 'admin')}
                className="input !w-40"
              >
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button onClick={opretInvitation} disabled={invTravl} className="btn-primary">
              {invTravl ? 'Opretter…' : '+ Opret invitation & kopiér link'}
            </button>
          </div>

          {/* Åbne invitationer */}
          {invitationer.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-asfalt-400">
                Åbne invitationer
              </h3>
              <ul className="mt-2 space-y-2">
                {invitationer.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-dashed border-asfalt-200 p-3 text-sm"
                  >
                    <span>
                      <strong>{i.navn}</strong> · {i.rolle === 'admin' ? 'admin' : 'moderator'}{' '}
                      <span className="text-asfalt-400">· afventer</span>
                    </span>
                    <span className="flex gap-3">
                      <button
                        onClick={() => kopierLink(i.token)}
                        className="font-bold text-hjelm-700 hover:underline"
                      >
                        Kopiér link
                      </button>
                      <button
                        onClick={() => adgangHandling({ handling: 'slet-invitation', id: i.id })}
                        className="font-bold text-murstensroed hover:underline"
                      >
                        Slet
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Personer med adgang */}
          <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-asfalt-400">
            Personer med adgang
          </h3>
          {adgange.length === 0 ? (
            <p className="mt-2 text-sm text-asfalt-500">Ingen endnu — ud over dig som formand.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {adgange.map((a) => (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-asfalt-200 p-3 text-sm ${
                    a.aktiv ? 'bg-white' : 'bg-asfalt-50 opacity-70'
                  }`}
                >
                  <span>
                    <strong>{a.navn}</strong>{' '}
                    <span className="rounded bg-asfalt-100 px-1.5 py-0.5 text-xs font-bold text-asfalt-600">
                      {a.rolle === 'admin' ? 'admin' : 'moderator'}
                    </span>
                    {!a.aktiv && (
                      <span className="ml-2 text-xs font-bold text-murstensroed">spærret</span>
                    )}
                    <span className="ml-2 text-xs text-asfalt-400">
                      {a.sidstBrugt ? `sidst inde ${relativTid(a.sidstBrugt)}` : 'aldrig logget ind'}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-3">
                    <button
                      onClick={() => nulstilAdgang(a.id, a.navn)}
                      className="font-bold text-hjelm-700 hover:underline"
                    >
                      Nulstil kodeord
                    </button>
                    <button
                      onClick={() => adgangHandling({ handling: 'aktiv', id: a.id, aktiv: !a.aktiv })}
                      className="font-bold text-asfalt-600 hover:underline"
                    >
                      {a.aktiv ? 'Spær' : 'Genåbn'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Slet adgangen for ${a.navn}?`))
                          adgangHandling({ handling: 'slet-adgang', id: a.id });
                      }}
                      className="font-bold text-murstensroed hover:underline"
                    >
                      Slet
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Rapport-log (kun admin) */}
      {erAdmin && (
        <section className="kort mt-6 p-6">
          <h2 className="text-lg font-bold text-asfalt-900">📥 Rapport-log</h2>
          <p className="mt-1 text-sm text-asfalt-500">
            Hvem har downloadet rapporter — med dato og tidspunkt. Kun synligt for admin.
          </p>
          {rapportLog.length === 0 ? (
            <p className="mt-3 text-sm text-asfalt-500">Ingen downloads endnu.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-asfalt-200 text-left text-asfalt-500">
                    <th className="p-2">Tidspunkt</th>
                    <th className="p-2">Hvem</th>
                    <th className="p-2">Format</th>
                    <th className="p-2">Indhold</th>
                  </tr>
                </thead>
                <tbody>
                  {rapportLog.map((r, i) => (
                    <tr key={i} className="border-b border-asfalt-100">
                      <td className="whitespace-nowrap p-2 text-asfalt-500">
                        {dkTidspunkt(r.oprettet)}
                      </td>
                      <td className="p-2">
                        <strong>{r.navn}</strong>{' '}
                        <span className="text-xs text-asfalt-400">({r.rolle})</span>
                      </td>
                      <td className="p-2 font-mono text-xs uppercase">{r.format}</td>
                      <td className="p-2 text-asfalt-600">
                        {TYPE_LABEL[r.type] ?? r.type} · top {r.antal}
                        {r.kunAendrede ? ' · kun nye/eskal.' : ''}
                        {r.medKommentarer ? ' · m. kommentarer' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Fejl-tabel */}
      <div className="kort mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-asfalt-200 text-left text-asfalt-500">
              <th className="p-3">▲</th>
              <th className="p-3">Titel</th>
              <th className="p-3">Model / Version</th>
              <th className="p-3">Status (auto)</th>
              <th className="p-3">Løst?</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {fejl.map((f) => (
              <tr key={f.id} className="border-b border-asfalt-100 align-top">
                <td className="p-3 font-black text-asfalt-800">{f.stemmer}</td>
                <td className="p-3">
                  <a href={`/fejl/${f.id}`} className="font-bold text-asfalt-900 hover:text-hjelm-700">
                    {f.titel}
                  </a>
                </td>
                <td className="p-3 text-asfalt-500">
                  <div>{f.bilmodel}</div>
                  <div className="font-mono text-xs">{f.softwareversion}</div>
                  {(f.telefon || f.telefon_os) && (
                    <div className="text-xs text-asfalt-400">
                      📱 {[f.telefon, f.telefon_os].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <StatusTag
                    status={beregnStatus({
                      loest_dato: f.loest_dato,
                      sidst_sendt_dato: f.sidst_sendt_dato,
                      bekraeftedeBiler: f.antal_ejer_bekraeftet,
                    })}
                  />
                </td>
                <td className="p-3">
                  {f.loest_dato ? (
                    <button
                      onClick={() => toggleLoest(f.id, false)}
                      disabled={travl === f.id}
                      className="rounded border-2 border-asfalt-200 px-2 py-1 text-xs font-bold text-asfalt-600 hover:bg-asfalt-50"
                    >
                      ↩︎ Genåbn
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleLoest(f.id, true)}
                      disabled={travl === f.id}
                      className="rounded border-2 border-graes px-2 py-1 text-xs font-bold text-graes hover:bg-graes hover:text-white"
                    >
                      ✅ Markér løst
                    </button>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setRedigerer(f)}
                      className="text-xs font-bold text-asfalt-600 hover:underline"
                    >
                      ✏️ Rediger
                    </button>
                    <button
                      onClick={() => slet(f.id, f.titel)}
                      disabled={travl === f.id}
                      className="text-xs font-bold text-murstensroed hover:underline"
                    >
                      🗑️ Slet
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {redigerer && (
        <RedigerModal
          fejl={redigerer}
          onLuk={() => setRedigerer(null)}
          onGemt={() => {
            setRedigerer(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RedigerModal({
  fejl,
  onLuk,
  onGemt,
}: {
  fejl: Fejl;
  onLuk: () => void;
  onGemt: () => void;
}) {
  const [titel, setTitel] = useState(fejl.titel);
  const [softwareversion, setSoftwareversion] = useState(fejl.softwareversion);
  const [beskrivelse, setBeskrivelse] = useState(fejl.beskrivelse);
  const [telefon, setTelefon] = useState(fejl.telefon ?? '');
  const [telefonOs, setTelefonOs] = useState(fejl.telefon_os ?? '');
  const [gemmer, setGemmer] = useState(false);
  const [fejlbesked, setFejlbesked] = useState('');

  async function gem(e: React.FormEvent) {
    e.preventDefault();
    setFejlbesked('');
    setGemmer(true);
    try {
      const res = await fetch('/api/admin/rediger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fejl.id,
          titel,
          softwareversion,
          beskrivelse,
          telefon,
          telefonOs,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onGemt();
      } else {
        setFejlbesked(data.error || 'Noget gik galt.');
        setGemmer(false);
      }
    } catch {
      setFejlbesked('Kunne ikke få forbindelse. Prøv igen.');
      setGemmer(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-asfalt-900/50 p-4"
      onClick={onLuk}
    >
      <form
        onSubmit={gem}
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-lg space-y-4 rounded-lg border-2 border-asfalt-900 bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-asfalt-900">✏️ Rediger bugherre</h2>
          <button
            type="button"
            onClick={onLuk}
            className="text-asfalt-400 hover:text-asfalt-700"
            aria-label="Luk"
          >
            ✕
          </button>
        </div>

        <div>
          <label htmlFor="r-titel" className="label">Titel</label>
          <input
            id="r-titel"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            maxLength={140}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="r-version" className="label">Softwareversion</label>
          <input
            id="r-version"
            value={softwareversion}
            onChange={(e) => setSoftwareversion(e.target.value)}
            className="input"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-telefon" className="label">Telefon (valgfri)</label>
            <input
              id="r-telefon"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              maxLength={60}
              placeholder="fx iPhone 15 Pro"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="r-telefonos" className="label">Telefon-OS (valgfri)</label>
            <input
              id="r-telefonos"
              value={telefonOs}
              onChange={(e) => setTelefonOs(e.target.value)}
              maxLength={60}
              placeholder="fx iOS 18.1"
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="r-besk" className="label">Beskrivelse</label>
          <textarea
            id="r-besk"
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            rows={5}
            className="input"
          />
        </div>

        {fejlbesked && (
          <p className="rounded-md border-2 border-murstensroed bg-red-50 p-3 text-sm font-bold text-murstensroed">
            {fejlbesked}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onLuk} className="btn-ghost text-sm">
            Annullér
          </button>
          <button type="submit" disabled={gemmer} className="btn-primary">
            {gemmer ? 'Gemmer…' : 'Gem ændringer'}
          </button>
        </div>
      </form>
    </div>
  );
}

function StatTile({
  tal,
  tekst,
  ikon,
  fremhaev = false,
}: {
  tal: number;
  tekst: string;
  ikon: string;
  fremhaev?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border-2 p-3 text-center ${
        fremhaev ? 'border-hjelm-500 bg-hjelm-50' : 'border-asfalt-200 bg-white'
      }`}
    >
      <div className="text-2xl font-black text-asfalt-900">
        <span aria-hidden>{ikon}</span> {tal}
      </div>
      <div className="mt-0.5 text-xs font-bold text-asfalt-500">{tekst}</div>
    </div>
  );
}
