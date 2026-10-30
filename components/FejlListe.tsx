'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { FejlMedSvar } from '@/lib/db';
import { soeg } from '@/lib/search';
import { relativTid } from '@/lib/tid';
import { hentSete, gemSete, hentMine, type SeteSvar } from '@/lib/svar-set';
import { ZEEKR_VARIANTER, MELDINGSTYPER } from '@/lib/config';
import StatusTag from '@/components/StatusTag';

type Sortering = 'stemmer' | 'nyeste' | 'aktivitet';
type TypeFilter = 'alle' | 'fejl' | 'oenske';

function mType(t: string | undefined) {
  return MELDINGSTYPER[t === 'oenske' ? 'oenske' : 'fejl'];
}

export default function FejlListe({
  fejl,
  startFilter = 'alle',
}: {
  fejl: FejlMedSvar[];
  startFilter?: TypeFilter;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sortering>('stemmer');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(startFilter);
  // Lokalt overlay af stemmetal, saa knappen opdaterer med det samme.
  const [stemmeOverlay, setStemmeOverlay] = useState<Record<number, number>>({});
  const [harStemt, setHarStemt] = useState<Record<number, boolean>>({});
  // Bil-bekraeftelse (vises lige efter man har stemt)
  const [visBekraeft, setVisBekraeft] = useState<Record<number, boolean>>({});
  const [minVariant, setMinVariant] = useState<Record<number, string>>({});
  const [bekraeftOverlay, setBekraeftOverlay] = useState<Record<number, number>>({});
  // Hvor mange svar brugeren har set pr. fejl (fra localStorage). null = ikke indlaest endnu.
  const [sete, setSete] = useState<SeteSvar | null>(null);
  // Fejl-ID'er denne browser selv har meldt ind + om vi kun viser dem.
  const [mine, setMine] = useState<number[]>([]);
  const [visKunMine, setVisKunMine] = useState(false);
  const [antalVist, setAntalVist] = useState(25);

  useEffect(() => {
    const gemt = hentSete();
    if (gemt === null) {
      // Foerste besoeg: saet baseline, saa intet fejlagtigt lyser som "nyt".
      const baseline: SeteSvar = {};
      for (const f of fejl) baseline[f.id] = f.antal_kommentarer;
      gemSete(baseline);
      setSete(baseline);
    } else {
      setSete(gemt);
    }
    setMine(hentMine());
    // Kun ved mount; forsiden re-mountes ved navigation, saa den er altid frisk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visteFejl = useMemo(() => {
    const fundet = soeg(fejl, query);
    const efterType =
      typeFilter === 'alle'
        ? fundet
        : fundet.filter((f) => (f.type === 'oenske' ? 'oenske' : 'fejl') === typeFilter);
    const filtreret = visKunMine ? efterType.filter((f) => mine.includes(f.id)) : efterType;
    const medOverlay = filtreret.map((f) => ({
      ...f,
      stemmer: stemmeOverlay[f.id] ?? f.stemmer,
    }));
    if (sort === 'nyeste') {
      return [...medOverlay].sort((a, b) => b.oprettet.localeCompare(a.oprettet));
    }
    if (sort === 'aktivitet') {
      return [...medOverlay].sort((a, b) => b.sidste_aktivitet.localeCompare(a.sidste_aktivitet));
    }
    return [...medOverlay].sort((a, b) => b.stemmer - a.stemmer);
  }, [fejl, query, sort, stemmeOverlay, visKunMine, mine, typeFilter]);

  // Antal af hver type (til filter-labels), uafhængigt af valgt filter.
  const antalFejl = fejl.filter((f) => f.type !== 'oenske').length;
  const antalOensker = fejl.filter((f) => f.type === 'oenske').length;

  // Begræns forsiden til et antal kort ad gangen (men vis alt ved søgning/filter).
  const begraens = !query && !visKunMine;
  const slutliste = begraens ? visteFejl.slice(0, antalVist) : visteFejl;

  async function upvote(id: number) {
    if (harStemt[id]) return;
    // Optimistisk opdatering
    setHarStemt((s) => ({ ...s, [id]: true }));
    const nuvaerende = stemmeOverlay[id] ?? fejl.find((f) => f.id === id)?.stemmer ?? 0;
    setStemmeOverlay((s) => ({ ...s, [id]: nuvaerende + 1 }));

    try {
      const res = await fetch('/api/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fejlId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setStemmeOverlay((s) => ({ ...s, [id]: data.stemmer }));
        setVisBekraeft((v) => ({ ...v, [id]: true })); // tilbyd bil-bekraeftelse
      } else {
        // rul tilbage
        setStemmeOverlay((s) => ({ ...s, [id]: nuvaerende }));
        setHarStemt((s) => ({ ...s, [id]: false }));
      }
    } catch {
      setStemmeOverlay((s) => ({ ...s, [id]: nuvaerende }));
      setHarStemt((s) => ({ ...s, [id]: false }));
    }
  }

  async function bekraeftEjer(id: number, variant: string) {
    try {
      const res = await fetch('/api/bekraeft-ejer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fejlId: id, variant }),
      });
      const data = await res.json();
      if (res.ok) {
        setMinVariant((m) => ({ ...m, [id]: variant }));
        setVisBekraeft((v) => ({ ...v, [id]: false }));
        if (typeof data.antal === 'number')
          setBekraeftOverlay((b) => ({ ...b, [id]: data.antal }));
      }
    } catch {
      /* stille fejl — bekraeftelse er valgfri */
    }
  }

  return (
    <div>
      {/* Soegebar */}
      <div className="mb-6">
        <label htmlFor="soeg" className="sr-only">
          Søg efter en melding
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl"
            aria-hidden
          >
            🔍
          </span>
          <input
            id="soeg"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg efter en fejl eller et ønske…"
            className="input !pl-12 !py-4 text-lg shadow-sm"
          />
        </div>
        <p className="mt-2 text-sm text-asfalt-500">
          Tip: søgningen er smart — selv &quot;lading&quot; eller en lille stavefejl finder det rigtige. 🧠
        </p>
      </div>

      {/* Mine meldinger (vises kun hvis denne browser har oprettet noget) */}
      {mine.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setVisKunMine((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition-colors ${
              visKunMine
                ? 'border-hjelm-500 bg-hjelm-100 text-asfalt-900'
                : 'border-asfalt-200 bg-white text-asfalt-700 hover:border-hjelm-400'
            }`}
          >
            🙋 Mine meldinger ({mine.length}){visKunMine && <span aria-hidden>✓</span>}
          </button>
        </div>
      )}

      {/* Type-filter: Alle / Fejl / Ønsker */}
      <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-asfalt-100 p-1">
        {([
          { key: 'alle', navn: 'Alle', antal: antalFejl + antalOensker },
          { key: 'fejl', navn: '🛠️ Fejl', antal: antalFejl },
          { key: 'oenske', navn: '💡 Ønsker', antal: antalOensker },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`rounded px-3 py-1 text-sm font-bold transition-colors ${
              typeFilter === f.key ? 'bg-hjelm-500 text-asfalt-900' : 'text-asfalt-600'
            }`}
          >
            {f.navn} <span className="font-normal opacity-70">({f.antal})</span>
          </button>
        ))}
      </div>

      {/* Sortering + antal */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-asfalt-600">
          {visteFejl.length}{' '}
          {typeFilter === 'oenske'
            ? visteFejl.length === 1
              ? 'ønske'
              : 'ønsker'
            : typeFilter === 'fejl'
              ? 'fejl'
              : visteFejl.length === 1
                ? 'melding'
                : 'meldinger'}
          {query && ' fundet'}
        </p>
        <div className="flex gap-1 rounded-lg bg-asfalt-100 p-1">
          <button
            onClick={() => setSort('stemmer')}
            className={`rounded px-3 py-1 text-sm font-bold transition-colors ${
              sort === 'stemmer' ? 'bg-hjelm-500 text-asfalt-900' : 'text-asfalt-600'
            }`}
          >
            Flest stemmer
          </button>
          <button
            onClick={() => setSort('nyeste')}
            className={`rounded px-3 py-1 text-sm font-bold transition-colors ${
              sort === 'nyeste' ? 'bg-hjelm-500 text-asfalt-900' : 'text-asfalt-600'
            }`}
          >
            Nyeste
          </button>
          <button
            onClick={() => setSort('aktivitet')}
            className={`rounded px-3 py-1 text-sm font-bold transition-colors ${
              sort === 'aktivitet' ? 'bg-hjelm-500 text-asfalt-900' : 'text-asfalt-600'
            }`}
          >
            Aktivitet
          </button>
        </div>
      </div>

      {/* Liste */}
      {visteFejl.length === 0 ? (
        <div className="kort p-10 text-center">
          {visKunMine ? (
            <>
              <p className="text-4xl" aria-hidden>🙋</p>
              <p className="mt-3 font-bold text-asfalt-700">
                Du har ikke meldt noget ind endnu
              </p>
              <p className="mt-1 text-sm text-asfalt-500">
                Når du melder en fejl eller et ønske, dukker den op her — og du kan følge med i svarene.
              </p>
              <Link href="/opret" className="btn-primary mt-4">
                Meld ind
              </Link>
            </>
          ) : (
            <>
              <p className="text-4xl" aria-hidden>🚧</p>
              <p className="mt-3 font-bold text-asfalt-700">
                Ingen meldinger matcher &quot;{query}&quot;
              </p>
              <p className="mt-1 text-sm text-asfalt-500">
                Fandt du ikke din fejl eller dit ønske? Så er det måske en helt ny en.
              </p>
              <Link href={`/opret?q=${encodeURIComponent(query)}`} className="btn-primary mt-4">
                Meld ind
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <ul className="grid gap-4">
          {slutliste.map((f) => (
            <li key={f.id} className="kort relative flex flex-col gap-3 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Upvote */}
              <button
                onClick={() => upvote(f.id)}
                disabled={harStemt[f.id]}
                aria-label={`${f.type === 'oenske' ? 'Ønsker du også dette?' : 'Oplever du også dette?'} Stem på: ${f.titel}`}
                className={`flex shrink-0 flex-col items-center justify-center rounded-lg border-2 px-4 py-2 font-black transition-colors ${
                  harStemt[f.id]
                    ? 'border-hjelm-500 bg-hjelm-100 text-asfalt-700'
                    : 'border-asfalt-200 bg-white text-asfalt-800 hover:border-hjelm-500 hover:bg-hjelm-50'
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>▲</span>
                <span className="text-xl leading-tight">{f.stemmer}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-asfalt-400">
                  {harStemt[f.id] ? 'Stemt!' : 'Mig med'}
                </span>
              </button>

              {/* Indhold */}
              <div className="min-w-0 flex-1">
                <Link href={`/fejl/${f.id}`} className="group">
                  <h3 className="text-lg font-bold text-asfalt-900 group-hover:text-hjelm-700">
                    {f.titel}
                  </h3>
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-asfalt-500">
                  <span className="rounded bg-asfalt-900 px-2 py-0.5 font-bold text-white">
                    {mType(f.type).ikon} {mType(f.type).badge}
                  </span>
                  <span className="rounded bg-asfalt-100 px-2 py-0.5 font-bold text-asfalt-700">
                    🚗 {f.bilmodel}
                  </span>
                  {f.softwareversion && (
                    <span className="rounded bg-asfalt-100 px-2 py-0.5 font-mono text-asfalt-700">
                      {f.softwareversion}
                    </span>
                  )}
                  <StatusTag status={f.status} />
                  <span className="text-asfalt-400">· 🕑 {relativTid(f.oprettet)}</span>
                  {(() => {
                    const antal = f.antal_kommentarer;
                    const nye = sete ? antal - (sete[f.id] ?? 0) : 0;
                    if (nye > 0)
                      return (
                        <span className="rounded bg-hjelm-500 px-2 py-0.5 font-bold text-asfalt-900">
                          🆕 {nye} {nye === 1 ? 'nyt svar' : 'nye svar'}
                        </span>
                      );
                    if (antal > 0)
                      return <span className="font-bold text-asfalt-500">💬 {antal}</span>;
                    return null;
                  })()}
                  {f.loesning_kommentar_id && (
                    <span className="rounded bg-graes px-2 py-0.5 font-bold text-white">
                      ✅ Løsning
                    </span>
                  )}
                  {(() => {
                    const bekr = bekraeftOverlay[f.id] ?? f.antal_ejer_bekraeftet;
                    return bekr > 0 ? (
                      <span className="rounded bg-asfalt-100 px-2 py-0.5 font-bold text-asfalt-700">
                        🚗 {bekr} bil-bekræftet
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              <Link
                href={`/fejl/${f.id}`}
                className="btn-ghost shrink-0 self-start text-sm sm:self-center"
              >
                Detaljer →
              </Link>
              </div>

              {/* Bil-bekraeftelse efter stemme (valgfri) */}
              {visBekraeft[f.id] && !minVariant[f.id] && (
                <div className="rounded-lg border-2 border-asfalt-200 bg-asfalt-50 p-3">
                  <p className="text-xs font-bold text-asfalt-700">
                    🚗 Ejer du selv en Zeekr 7GT? Vælg din variant, så tæller stemmen som
                    bil-bekræftet:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ZEEKR_VARIANTER.map((v) => (
                      <button
                        key={v}
                        onClick={() => bekraeftEjer(f.id, v)}
                        className="rounded-lg border-2 border-asfalt-300 bg-white px-2.5 py-1 text-xs font-bold text-asfalt-800 transition-colors hover:border-hjelm-500 hover:bg-hjelm-50"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {minVariant[f.id] && (
                <p className="rounded-lg border-2 border-graes bg-green-50 p-2 text-xs font-bold text-asfalt-700">
                  ✅ Tak — din stemme er nu bil-bekræftet ({minVariant[f.id]}).
                </p>
              )}
            </li>
          ))}
          </ul>
          {begraens && visteFejl.length > antalVist && (
            <div className="mt-6 text-center">
              <button onClick={() => setAntalVist((n) => n + 25)} className="btn-ghost">
                Vis flere ({visteFejl.length - antalVist} tilbage)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
