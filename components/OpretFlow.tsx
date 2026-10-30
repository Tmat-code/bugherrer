'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BILMODELLER,
  KUN_EN_MODEL,
  STANDARD_BILMODEL,
  type MeldingsType,
} from '@/lib/config';
import type { Fejl } from '@/lib/db';
import { tilfoejMin } from '@/lib/svar-set';
import StatusTag from '@/components/StatusTag';
import Turnstile from '@/components/Turnstile';

type Trin = 'vaelg' | 'soeg' | 'fejl40' | 'formular';

export default function OpretFlow() {
  const router = useRouter();
  const params = useSearchParams();

  // Hvis ?type=oenske sendes med, start direkte på den gren.
  const startType = params.get('type') === 'oenske' ? 'oenske' : null;

  const [type, setType] = useState<MeldingsType | null>(startType);
  const [trin, setTrin] = useState<Trin>(startType ? 'soeg' : 'vaelg');
  const [soegeord, setSoegeord] = useState(params.get('q') || '');
  const [harSoegt, setHarSoegt] = useState(false);
  const [lignende, setLignende] = useState<Fejl[]>([]);
  const [soeger, setSoeger] = useState(false);

  const erOenske = type === 'oenske';
  // Ønsker springer "Fejl 40"-tjekket over.
  const naesteEfterSoeg: Trin = erOenske ? 'formular' : 'fejl40';

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

  useEffect(() => {
    if (params.get('q') && params.get('q')!.trim().length >= 3 && startType) {
      udfoerSoegning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function vaelgType(t: MeldingsType) {
    setType(t);
    setTrin('soeg');
  }

  // Trin-indikator afhænger af type (ønsker har intet Fejl 40-trin).
  const trinListe: { key: Trin; navn: string }[] = erOenske
    ? [
        { key: 'soeg', navn: '1. Søg' },
        { key: 'formular', navn: '2. Udfyld' },
      ]
    : [
        { key: 'soeg', navn: '1. Søg' },
        { key: 'fejl40', navn: '2. Fejl 40' },
        { key: 'formular', navn: '3. Udfyld' },
      ];

  return (
    <div>
      {/* ===== TRIN 0: VÆLG TYPE ===== */}
      {trin === 'vaelg' && (
        <div className="kort p-6">
          <h2 className="text-lg font-bold text-asfalt-900">Hvad vil du melde?</h2>
          <p className="mt-1 text-sm text-asfalt-500">
            Vælg om det er en <strong>fejl</strong> (noget der ikke virker), eller et{' '}
            <strong>ønske</strong> til ny funktionalitet.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => vaelgType('fejl')}
              className="rounded-lg border-2 border-asfalt-200 bg-white p-5 text-left transition-colors hover:border-hjelm-500 hover:bg-hjelm-50"
            >
              <span className="text-3xl" aria-hidden>🛠️</span>
              <span className="mt-2 block text-base font-bold text-asfalt-900">En fejl</span>
              <span className="mt-0.5 block text-sm text-asfalt-500">
                Noget i bilen virker ikke, som det skal — en &quot;bugherre&quot;.
              </span>
            </button>
            <button
              onClick={() => vaelgType('oenske')}
              className="rounded-lg border-2 border-asfalt-200 bg-white p-5 text-left transition-colors hover:border-hjelm-500 hover:bg-hjelm-50"
            >
              <span className="text-3xl" aria-hidden>💡</span>
              <span className="mt-2 block text-base font-bold text-asfalt-900">Et ønske</span>
              <span className="mt-0.5 block text-sm text-asfalt-500">
                En funktion eller forbedring, du ønsker Zeekr tilføjer.
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Trin-indikator (vises når type er valgt) */}
      {trin !== 'vaelg' && (
        <ol className="mb-6 flex items-center gap-2 text-xs font-bold">
          {trinListe.map((t, i) => {
            const aktiv = trin === t.key;
            const faerdig = trinListe.findIndex((x) => x.key === trin) > i;
            return (
              <li
                key={t.key}
                className={`rounded-full px-3 py-1 ${
                  aktiv
                    ? 'bg-hjelm-500 text-asfalt-900'
                    : faerdig
                      ? 'bg-asfalt-800 text-hjelm-300'
                      : 'bg-asfalt-100 text-asfalt-400'
                }`}
              >
                {t.navn}
              </li>
            );
          })}
        </ol>
      )}

      {/* ===== TRIN 1: SØG ===== */}
      {trin === 'soeg' && (
        <div className="kort p-6">
          <h2 className="text-lg font-bold text-asfalt-900">
            🔍 Først: har nogen allerede meldt det?
          </h2>
          <p className="mt-1 text-sm text-asfalt-500">
            Søg efter din {erOenske ? 'idé' : 'fejl'}. Finder vi noget, der ligner, så giv
            den en stemme i stedet — det tæller mere end en ny dublet.
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
              placeholder={
                erOenske ? "Fx 'CarPlay trådløst' eller 'mørkt tema'…" : "Fx 'opladning stopper' eller 'bagklap'…"
              }
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

          {harSoegt && (
            <div className="mt-5">
              {lignende.length > 0 ? (
                <div className="rounded-lg border-2 border-advarsel-500 bg-advarsel-50 p-4">
                  <p className="font-bold text-advarsel-700">
                    ⚠️ Findes det allerede herunder? Så giv det en stemme i stedet!
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
                              {f.bilmodel}
                              {f.softwareversion ? ` · ${f.softwareversion}` : ''}
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
                    Er ingen af dem din melding? Så er den sandsynligvis helt ny:
                  </p>
                  <button onClick={() => setTrin(naesteEfterSoeg)} className="btn-secondary mt-2">
                    Nej, min melding er ny → fortsæt
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-graes bg-green-50 p-4">
                  <p className="font-bold text-asfalt-800">
                    ✅ Ingen dubletter fundet — din melding ser ud til at være ny!
                  </p>
                  <button onClick={() => setTrin(naesteEfterSoeg)} className="btn-primary mt-3">
                    Fortsæt →
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setType(null);
              setTrin('vaelg');
            }}
            className="mt-4 text-sm text-asfalt-400 hover:text-asfalt-600"
          >
            ← Vælg type igen
          </button>
        </div>
      )}

      {/* ===== TRIN 2: FEJL 40-TJEK (kun fejl) ===== */}
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
              (Rygtet siger at ca. 40% af alle bugherrer forsvinder efter en genstart. Deraf navnet. 😉)
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
        <Formular
          type={type ?? 'fejl'}
          startTitel={soegeord}
          onTilbage={() => setTrin(naesteEfterSoeg)}
        />
      )}
    </div>
  );
}

// --- Selve formularen ---
function Formular({
  type,
  startTitel,
  onTilbage,
}: {
  type: MeldingsType;
  startTitel: string;
  onTilbage: () => void;
}) {
  const router = useRouter();
  const erOenske = type === 'oenske';
  const [titel, setTitel] = useState(startTitel);
  const [bilmodel, setBilmodel] = useState<string>(KUN_EN_MODEL ? STANDARD_BILMODEL : '');
  const [softwareversion, setSoftwareversion] = useState('');
  const [telefon, setTelefon] = useState('');
  const [telefonOs, setTelefonOs] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [fejlbesked, setFejlbesked] = useState('');
  const [sender, setSender] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejlbesked('');
    setSender(true);
    try {
      const res = await fetch('/api/fejl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          titel,
          bilmodel,
          softwareversion,
          telefon,
          telefonOs,
          beskrivelse,
          turnstileToken,
          honeypot,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.id) tilfoejMin(Number(data.id));
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
      <h2 className="text-lg font-bold text-asfalt-900">
        {erOenske ? '💡 Beskriv dit ønske' : '📋 Beskriv bugherren'}
      </h2>

      <div>
        <label htmlFor="titel" className="label">
          {erOenske ? 'Titel på ønsket *' : 'Titel på fejlen *'}
        </label>
        <input
          id="titel"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={
            erOenske
              ? "Kort og præcist, fx 'Trådløst CarPlay'"
              : "Kort og præcist, fx 'Opladning stopper ved 80%'"
          }
          className="input"
          maxLength={140}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {KUN_EN_MODEL ? (
          <div>
            <span className="label">Bilmodel</span>
            <div className="input flex items-center gap-2 bg-asfalt-50 font-bold text-asfalt-700">
              🚗 {STANDARD_BILMODEL}
            </div>
          </div>
        ) : (
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
        )}
        <div>
          <label htmlFor="version" className="label">
            {erOenske ? 'Nuværende softwareversion (valgfri)' : 'Nuværende softwareversion *'}
          </label>
          <input
            id="version"
            value={softwareversion}
            onChange={(e) => setSoftwareversion(e.target.value)}
            placeholder="fx OS 1.3.0"
            className="input"
            required={!erOenske}
          />
        </div>
      </div>

      {/* Telefon-felter: kun relevant for fejl (software/forbindelse). */}
      {!erOenske && (
        <div className="rounded-lg border-2 border-dashed border-asfalt-200 p-4">
          <p className="text-sm font-bold text-asfalt-700">
            📱 Telefon <span className="font-normal text-asfalt-400">— valgfrit</span>
          </p>
          <p className="mt-0.5 text-xs text-asfalt-500">
            Udfyld kun hvis fejlen handler om telefonen (CarPlay / Android Auto, appen,
            Bluetooth e.l.). Det hjælper med at finde mønstre på tværs af telefoner.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="telefon" className="label">Telefonmodel</label>
              <input
                id="telefon"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="fx iPhone 15 Pro / Samsung S24"
                className="input"
                maxLength={60}
              />
            </div>
            <div>
              <label htmlFor="telefonOs" className="label">Telefonens OS</label>
              <input
                id="telefonOs"
                value={telefonOs}
                onChange={(e) => setTelefonOs(e.target.value)}
                placeholder="fx iOS 18.1 / Android 15"
                className="input"
                maxLength={60}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="beskrivelse" className="label">
          {erOenske
            ? 'Beskriv ønsket — hvad, og hvorfor? *'
            : 'Præcis beskrivelse — hvordan genskabes fejlen? *'}
        </label>
        <textarea
          id="beskrivelse"
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          rows={5}
          placeholder={
            erOenske
              ? 'Hvad ønsker du, og hvorfor ville det gøre bilen bedre? Jo mere konkret, jo bedre kan Zeekr vurdere det.'
              : 'Trin for trin: Hvad gør du, hvad sker der, og hvornår? Jo mere præcist, jo nemmere kan Zeekr reproducere det.'
          }
          className="input"
          required
        />
        <p className="mt-1 text-xs text-asfalt-400">{beskrivelse.length} tegn</p>
      </div>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <Turnstile onToken={setTurnstileToken} />

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
          {sender ? 'Opretter…' : erOenske ? '💡 Meld ønsket' : '🛠️ Meld bugherren'}
        </button>
      </div>
    </form>
  );
}
