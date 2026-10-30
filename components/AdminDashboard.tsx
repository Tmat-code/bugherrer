'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Fejl } from '@/lib/db';
import { STATUSSER } from '@/lib/config';
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

export default function AdminDashboard({
  fejl,
  overblik,
}: {
  fejl: Fejl[];
  overblik: Overblik;
}) {
  const router = useRouter();
  const [top, setTop] = useState<number | 'alle'>(20);
  const [sprog, setSprog] = useState('da');
  const [kunAendrede, setKunAendrede] = useState(false);
  const [medKommentarer, setMedKommentarer] = useState(false);
  const [rapportType, setRapportType] = useState<'fejl' | 'oenske' | 'begge'>('fejl');
  const [markerTravl, setMarkerTravl] = useState(false);
  const [travl, setTravl] = useState<number | null>(null);
  const [henvTravl, setHenvTravl] = useState<number | null>(null);
  const [redigerer, setRedigerer] = useState<Fejl | null>(null);

  async function skiftStatus(id: number, status: string) {
    setTravl(id);
    try {
      await fetch('/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
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

  async function markerSendt() {
    if (
      !confirm(
        `Markér ${top === 'alle' ? 'alle' : 'de ' + top + ' øverste'}${kunAendrede ? ' (nye + eskalerende)' : ''} som sendt til Zeekr nu?\n\n` +
          'Deres nuværende stemmetal gemmes som nulpunkt, så de først dukker op igen næste gang, hvis de får flere stemmer.'
      )
    )
      return;
    setMarkerTravl(true);
    try {
      const res = await fetch('/api/admin/marker-sendt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top, kunAendrede, type: rapportType }),
      });
      const data = await res.json();
      alert(res.ok ? `✅ ${data.antal} bugherrer markeret som sendt.` : data.error || 'Noget gik galt.');
      router.refresh();
    } finally {
      setMarkerTravl(false);
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-asfalt-900">
            🏗️ Byggeledelse (admin)
          </h1>
          <p className="text-sm text-asfalt-500">{fejl.length} bugherrer i databasen.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/statistik" className="btn-ghost text-sm">📈 Aktivitet</a>
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

      {/* Eksport-panel */}
      <div className="kort mt-6 p-6">
        <h2 className="text-lg font-bold text-asfalt-900">📤 Eksport til Zeekr-importør</h2>
        <p className="mt-1 text-sm text-asfalt-500">
          Generér en rapport med de mest upvotede bugherrer — klar til at sende videre.
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
          <a
            href={`/api/admin/export?top=${top}&sprog=${sprog}&type=${rapportType}${kunAendrede ? '&kunAendrede=1' : ''}${medKommentarer ? '&kommentarer=1' : ''}`}
            className="btn-primary"
          >
            📄 Download PDF-rapport
          </a>
          <a
            href={`/api/admin/export/csv?top=${top}&sprog=${sprog}&type=${rapportType}${kunAendrede ? '&kunAendrede=1' : ''}${medKommentarer ? '&kommentarer=1' : ''}`}
            className="btn-secondary"
          >
            📊 Download CSV
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

        {/* Eskalerings-filter + markér-sendt */}
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
          <button
            onClick={markerSendt}
            disabled={markerTravl}
            className="btn-ghost mt-3 text-sm"
          >
            {markerTravl
              ? 'Markerer…'
              : `📮 Markér ${top === 'alle' ? 'alle' : 'top ' + top} som sendt til Zeekr`}
          </button>
          <p className="mt-1 text-xs text-asfalt-400">
            Tryk her <em>når du har sendt rapporten</em> — så starter deres delta forfra.
          </p>
        </div>

        {sprog !== 'da' && (
          <p className="mt-3 text-xs text-asfalt-500">
            💡 Fejl-teksten oversættes via LibreTranslate (kræver{' '}
            <code>LIBRETRANSLATE_URL</code>). Uden den er rammen på det valgte sprog, men
            fejl-teksten forbliver dansk.
          </p>
        )}
      </div>

      {/* Fejl-tabel */}
      <div className="kort mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-asfalt-200 text-left text-asfalt-500">
              <th className="p-3">▲</th>
              <th className="p-3">Titel</th>
              <th className="p-3">Model / Version</th>
              <th className="p-3">Status</th>
              <th className="p-3">Skift status</th>
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
                <td className="p-3"><StatusTag status={f.status} /></td>
                <td className="p-3">
                  <select
                    value={f.status}
                    onChange={(e) => skiftStatus(f.id, e.target.value)}
                    disabled={travl === f.id}
                    className="rounded border-2 border-asfalt-200 px-2 py-1 text-xs"
                  >
                    {STATUSSER.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
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
