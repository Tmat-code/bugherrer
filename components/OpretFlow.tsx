'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BILMODELLER } from '@/lib/config';
import type { Fejl } from '@/lib/db';
import StatusTag from '@/components/StatusTag';

type Trin = 'soeg' | 'fejl40' | 'formular';

export default function OpretFlow() {
  const router = useRouter();
  const params = useSearchParams();

  const [trin, setTrin] = useState<Trin>('soeg');
  const [soegeord, setSoegeord] = useState(params.get('q') || '');
  const [harSoegt, setHarSoegt] = useState(false);
  const [lignende, setLignende] = useState<Fejl[]>([]);
  const [soeger, setSoeger] = useState(false);

  // --- TRIN 1: Tvungen søgning ---
  async function udfoerSoegning() {
    if (soegeord.trim().length < 3) return;
    setSoeger(true);
    try {
      const res = await fetch(`/api/fejl?q=${encodeURIComponent(soegeord)}`);
      const data = await res.json();
      setLignende(data.lignende || []);
    } catch {
      setLignende([]);
    } finally {
      setSoeger(false);
      setHarSoegt(true);
    }
  }

  // Hvis man kom fra forsiden med ?q=, kør søgningen automatisk.
  useEffect(() => {
    if (params.get('q') && params.get('q')!.trim().length >= 3) {
      udfoerSoegning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Trin-indikator */}
      <ol className="mb-6 flex items-center gap-2 text-xs font-bold">
        {(['soeg', 'fejl40', 'formular'] as Trin[]).map((t, i) => {
          const navne = { soeg: '1. Søg', fejl40: '2. Fejl 40', formular: '3. Udfyld' };
          const aktiv = trin === t;
          const faerdig =
            (['soeg', 'fejl40', 'formular'] as Trin[]).indexOf(trin) > i;
          return (
            <li
              key={t}
              className={`rounded-full px-3 py-1 ${
                aktiv
                  ? 'bg-hjelm-500 text-asfalt-900'
                  : faerdig
                    ? 'bg-asfalt-800 text-hjelm-300'
                    : 'bg-asfalt-100 text-asfalt-400'
              }`}
            >
              {navne[t]}
            </li>
          );
        })}
      </ol>

      {/* ===== TRIN 1: SØG ===== */}
      {trin === 'soeg' && (
        <div className="kort p-6">
          <h2 className="text-lg font-bold text-asfalt-900">
            🔍 Først: har nogen allerede meldt den?
          </h2>
          <p className="mt-1 text-sm text-asfalt-500">
            Søg på din fejl. Finder vi noget, der ligner, så giv den en stemme i
            stedet — det tæller mere end en ny dublet.
          </p>

          <div className="mt-4 flex gap-2">
            <input
              type="search"
              value={soegeord}
              onChange={(e) => {
                setSoegeord(e.target.value);
                setHarSoegt(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && udfoerSoegning()}
              placeholder="Fx 'opladning stopper' eller 'bagklap'…"
              className="input"
            />
            <button
              onClick={udfoerSoegning}
              disabled={soegeord.trim().length < 3 || soeger}
              className="btn-primary shrink-0"
            >
              {soeger ? 'Søger…' : 'Søg'}
            </button>
          </div>

          {/* Resultat */}
          {harSoegt && (
            <div className="mt-5">
              {lignende.length > 0 ? (
                <div className="rounded-lg border-2 border-advarsel-500 bg-advarsel-50 p-4">
                  <p className="font-bold text-advarsel-700">
                    ⚠️ Findes din fejl allerede herunder? Så giv den en stemme i stedet!
                  </p>
                  <ul className="mt-3 space-y-2">
                    {lignende.map((f) => (
                      <li key={f.id}>
                        <Link
                          href={`/fejl/${f.id}`}
                          className="flex items-center justify-between rounded-md bg-white p-3 hover:border-hjelm-500 border-2 border-transparent"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-asfalt-800">
                              {f.titel}
                            </span>
                            <span className="text-xs text-asfalt-500">
                              {f.bilmodel} · {f.softwareversion}
                            </span>
                          </span>
                          <span className="ml-3 flex shrink-0 items-center gap-2">
                            <StatusTag status={f.status} />
                            <span className="font-black text-asfalt-700">▲ {f.stemmer}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-asfalt-600">
                    Er ingen af dem din fejl? Så er den sandsynligvis helt ny:
                  </p>
                  <button onClick={() => setTrin('fejl40')} className="btn-secondary mt-2">
                    Nej, min fejl er ny → fortsæt
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-graes bg-green-50 p-4">
                  <p className="font-bold text-asfalt-800">
                    ✅ Ingen dubletter fundet — din bygherre ser ud til at være ny!
                  </p>
                  <button onClick={() => setTrin('fejl40')} className="btn-primary mt-3">
                    Fortsæt →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== TRIN 2: FEJL 40-TJEK ===== */}
      {trin === 'fejl40' && (
        <div className="kort p-6">
          <div className="text-center">
            <span className="text-5xl" aria-hidden>🔌</span>
            <h2 className="mt-3 text-lg font-bold text-asfalt-900">
              &quot;Fejl 40&quot;-tjekket
            </h2>
            <p className="mx-auto mt-2 max-w-md text-asfalt-600">
              Har du prøvet at <strong>genstarte skærmen</strong>?
              Hold den fysiske reset-knap / Ctrl-knap inde i ca. 10-15 sekunder,
              til skærmen slukker og starter forfra.
            </p>
            <p className="mt-2 text-sm text-asfalt-500">
              (Rygtet siger at ca. 40% af alle bygherrer forsvinder efter en genstart. Deraf navnet. 😉)
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => router.push('/')}
              className="btn-ghost justify-center !py-4"
            >
              ✅ Ja — og det løste det!
              <span className="block text-xs font-normal text-asfalt-400">
                Så behøver vi ikke melde den. Tak!
              </span>
            </button>
            <button
              onClick={() => setTrin('formular')}
              className="btn-primary justify-center !py-4"
            >
              ❌ Nej — fejlen er der stadig
              <span className="block text-xs font-normal text-asfalt-700">
                Så melder vi den rigtigt →
              </span>
            </button>
          </div>

          <button
            onClick={() => setTrin('soeg')}
            className="mt-4 text-sm text-asfalt-400 hover:text-asfalt-600"
          >
            ← Tilbage til søgning
          </button>
        </div>
      )}

      {/* ===== TRIN 3: FORMULAR ===== */}
      {trin === 'formular' && (
        <Formular startTitel={soegeord} onTilbage={() => setTrin('fejl40')} />
      )}
    </div>
  );
}

// --- Selve formularen ---
function Formular({
  startTitel,
  onTilbage,
}: {
  startTitel: string;
  onTilbage: () => void;
}) {
  const router = useRouter();
  const [titel, setTitel] = useState(startTitel);
  const [bilmodel, setBilmodel] = useState<string>('');
  const [softwareversion, setSoftwareversion] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [fejlbesked, setFejlbesked] = useState('');
  const [sender, setSender] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejlbesked('');
    setSender(true);
    try {
      const res = await fetch('/api/fejl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titel, bilmodel, softwareversion, beskrivelse }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/fejl/${data.id}`);
      } else {
        setFejlbesked(data.error || 'Noget gik galt.');
        setSender(false);
      }
    } catch {
      setFejlbesked('Kunne ikke få forbindelse. Prøv igen.');
      setSender(false);
    }
  }

  return (
    <form onSubmit={submit} className="kort space-y-4 p-6">
      <h2 className="text-lg font-bold text-asfalt-900">📋 Beskriv bygherren</h2>

      <div>
        <label htmlFor="titel" className="label">Titel på fejlen *</label>
        <input
          id="titel"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Kort og præcist, fx 'Opladning stopper ved 80%'"
          className="input"
          maxLength={140}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bilmodel" className="label">Bilmodel *</label>
          <select
            id="bilmodel"
            value={bilmodel}
            onChange={(e) => setBilmodel(e.target.value)}
            className="input"
            required
          >
            <option value="" disabled>Vælg model…</option>
            {BILMODELLER.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="version" className="label">Nuværende softwareversion *</label>
          <input
            id="version"
            value={softwareversion}
            onChange={(e) => setSoftwareversion(e.target.value)}
            placeholder="fx OS 1.2.1"
            className="input"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="beskrivelse" className="label">
          Præcis beskrivelse — hvordan genskabes fejlen? *
        </label>
        <textarea
          id="beskrivelse"
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          rows={5}
          placeholder="Trin for trin: Hvad gør du, hvad sker der, og hvornår? Jo mere præcist, jo nemmere kan Zeekr reproducere det."
          className="input"
          required
        />
        <p className="mt-1 text-xs text-asfalt-400">{beskrivelse.length} tegn</p>
      </div>

      {fejlbesked && (
        <p className="rounded-md border-2 border-murstensroed bg-red-50 p-3 text-sm font-bold text-murstensroed">
          {fejlbesked}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onTilbage} className="text-sm text-asfalt-400 hover:text-asfalt-600">
          ← Tilbage
        </button>
        <button type="submit" disabled={sender} className="btn-primary">
          {sender ? 'Opretter…' : '🛠️ Meld bygherren'}
        </button>
      </div>
    </form>
  );
}
