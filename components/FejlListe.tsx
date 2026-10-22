'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Fejl } from '@/lib/db';
import { soeg } from '@/lib/search';
import StatusTag from '@/components/StatusTag';

type Sortering = 'stemmer' | 'nyeste';

export default function FejlListe({ fejl }: { fejl: Fejl[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sortering>('stemmer');
  // Lokalt overlay af stemmetal, saa knappen opdaterer med det samme.
  const [stemmeOverlay, setStemmeOverlay] = useState<Record<number, number>>({});
  const [harStemt, setHarStemt] = useState<Record<number, boolean>>({});

  const visteFejl = useMemo(() => {
    const filtreret = soeg(fejl, query);
    const medOverlay = filtreret.map((f) => ({
      ...f,
      stemmer: stemmeOverlay[f.id] ?? f.stemmer,
    }));
    if (sort === 'nyeste') {
      return [...medOverlay].sort((a, b) => b.oprettet.localeCompare(a.oprettet));
    }
    return [...medOverlay].sort((a, b) => b.stemmer - a.stemmer);
  }, [fejl, query, sort, stemmeOverlay]);

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

  return (
    <div>
      {/* Soegebar */}
      <div className="mb-6">
        <label htmlFor="soeg" className="sr-only">
          Søg efter en bygherre
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
            placeholder="Søg efter en 'bygherre' (fejl)…"
            className="input !pl-12 !py-4 text-lg shadow-sm"
          />
        </div>
        <p className="mt-2 text-sm text-asfalt-500">
          Tip: søgningen er smart — selv &quot;lading&quot; eller en lille stavefejl finder det rigtige. 🧠
        </p>
      </div>

      {/* Sortering + antal */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-asfalt-600">
          {visteFejl.length} {visteFejl.length === 1 ? 'bygherre' : 'bygherrer'}
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
        </div>
      </div>

      {/* Liste */}
      {visteFejl.length === 0 ? (
        <div className="kort p-10 text-center">
          <p className="text-4xl" aria-hidden>🚧</p>
          <p className="mt-3 font-bold text-asfalt-700">
            Ingen bygherrer matcher &quot;{query}&quot;
          </p>
          <p className="mt-1 text-sm text-asfalt-500">
            Fandt du ikke din fejl? Så er det måske en helt ny en.
          </p>
          <Link href={`/opret?q=${encodeURIComponent(query)}`} className="btn-primary mt-4">
            Meld en ny bygherre
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {visteFejl.map((f) => (
            <li key={f.id} className="kort relative flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              {/* Upvote */}
              <button
                onClick={() => upvote(f.id)}
                disabled={harStemt[f.id]}
                aria-label={`Oplever du også dette? Stem på: ${f.titel}`}
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
                  <span className="rounded bg-asfalt-100 px-2 py-0.5 font-bold text-asfalt-700">
                    🚗 {f.bilmodel}
                  </span>
                  <span className="rounded bg-asfalt-100 px-2 py-0.5 font-mono text-asfalt-700">
                    {f.softwareversion}
                  </span>
                  <StatusTag status={f.status} />
                </div>
              </div>

              <Link
                href={`/fejl/${f.id}`}
                className="btn-ghost shrink-0 self-start text-sm sm:self-center"
              >
                Detaljer →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
