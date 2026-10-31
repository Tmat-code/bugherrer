'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TJEKLISTE, TJEKLISTE_TITEL, TJEKLISTE_INTRO } from '@/lib/tjekliste';

const NOEGLE = 'bugherrer_tjekliste_v1';

export default function TjeklisteKlient() {
  const [afkrydset, setAfkrydset] = useState<Record<string, boolean>>({});
  const [indlaest, setIndlaest] = useState(false);

  useEffect(() => {
    try {
      const gemt = localStorage.getItem(NOEGLE);
      if (gemt) setAfkrydset(JSON.parse(gemt));
    } catch {
      /* ignore */
    }
    setIndlaest(true);
  }, []);

  function gem(nyt: Record<string, boolean>) {
    setAfkrydset(nyt);
    try {
      localStorage.setItem(NOEGLE, JSON.stringify(nyt));
    } catch {
      /* ignore */
    }
  }

  function toggle(id: string) {
    gem({ ...afkrydset, [id]: !afkrydset[id] });
  }

  const alle = TJEKLISTE.flatMap((s, si) => s.punkter.map((_, pi) => `${si}-${pi}`));
  const antalAfkrydset = alle.filter((id) => afkrydset[id]).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/links" className="no-print text-sm font-bold text-asfalt-500 hover:text-hjelm-700">
        ← Tilbage til links
      </Link>

      {/* Banner */}
      <section className="mt-4 overflow-hidden rounded-xl border-4 border-asfalt-900 bg-asfalt-900 text-white">
        <div className="h-3 w-full bg-advarselsstriber" aria-hidden />
        <div className="px-6 py-6">
          <h1 className="text-2xl font-black sm:text-3xl">
            📋 {TJEKLISTE_TITEL}
          </h1>
          <p className="mt-2 text-asfalt-200">{TJEKLISTE_INTRO}</p>
          <p className="mt-1 text-sm text-hjelm-300">
            Til <strong className="text-white">Zeekr 7GT</strong>
          </p>
        </div>
      </section>

      {/* Handlinger */}
      <div className="no-print mt-5 flex flex-wrap items-center gap-3">
        <a href="/api/tjekliste" className="btn-primary">
          ⬇️ Hent som PDF (til print)
        </a>
        <button onClick={() => window.print()} className="btn-secondary">
          🖨️ Udskriv
        </button>
        {indlaest && (
          <span className="text-sm font-bold text-asfalt-500">
            {antalAfkrydset} / {alle.length} afkrydset
          </span>
        )}
        {antalAfkrydset > 0 && (
          <button
            onClick={() => gem({})}
            className="text-sm text-asfalt-400 hover:text-murstensroed"
          >
            Nulstil
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="mt-6 space-y-6">
        {TJEKLISTE.map((sektion, si) => (
          <section key={si} className="kort p-5">
            <h2 className="border-b-2 border-hjelm-500 pb-2 text-lg font-bold text-asfalt-900">
              {sektion.titel}
            </h2>
            <ul className="mt-3 space-y-2">
              {sektion.punkter.map((punkt, pi) => {
                const id = `${si}-${pi}`;
                const on = !!afkrydset[id];
                return (
                  <li key={pi}>
                    <button
                      onClick={() => toggle(id)}
                      className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-asfalt-50"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-black ${
                          on
                            ? 'border-graes bg-graes text-white'
                            : 'border-asfalt-400 bg-white text-transparent'
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span
                        className={`text-asfalt-800 ${on ? 'text-asfalt-400 line-through' : ''}`}
                      >
                        {punkt}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="no-print mt-6 text-xs leading-relaxed text-asfalt-500">
        💡 Afkrydsninger gemmes kun i din egen browser. Vil du have den på papir, så hent
        PDF&apos;en eller tryk Udskriv.
      </p>
    </div>
  );
}
