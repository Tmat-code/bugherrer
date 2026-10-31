'use client';

import { useEffect, useState } from 'react';
import { TJEKLISTE, TJEKLISTE_INTRO } from '@/lib/tjekliste';

const NOEGLE = 'bugherrer_tjekliste_v1';

export default function Tjekliste() {
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

  function toggle(id: string) {
    setAfkrydset((prev) => {
      const naeste = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(NOEGLE, JSON.stringify(naeste));
      } catch {
        /* ignore */
      }
      return naeste;
    });
  }

  function nulstil() {
    setAfkrydset({});
    try {
      localStorage.removeItem(NOEGLE);
    } catch {
      /* ignore */
    }
  }

  const alle = TJEKLISTE.reduce((n, s) => n + s.punkter.length, 0);
  const antalAfkrydset = Object.values(afkrydset).filter(Boolean).length;

  return (
    <div>
      <p className="text-asfalt-600">{TJEKLISTE_INTRO}</p>

      {/* Handlinger (udskrives ikke) */}
      <div className="no-print mt-5 flex flex-wrap items-center gap-3">
        <a href="/api/tjekliste" className="btn-primary">
          ⬇️ Download som PDF
        </a>
        <button onClick={() => window.print()} className="btn-secondary">
          🖨️ Print
        </button>
        {indlaest && antalAfkrydset > 0 && (
          <>
            <span className="text-sm font-bold text-asfalt-500">
              {antalAfkrydset} af {alle} klaret
            </span>
            <button onClick={nulstil} className="text-sm text-asfalt-400 hover:text-murstensroed">
              Nulstil
            </button>
          </>
        )}
      </div>

      <p className="no-print mt-2 text-xs text-asfalt-400">
        Dine flueben gemmes kun i din egen browser. Vil du have et rent ark med til
        forhandleren, så hent PDF&apos;en og print den.
      </p>

      {/* Sektioner */}
      <div className="mt-6 space-y-6">
        {TJEKLISTE.map((sektion, si) => (
          <section key={si} className="kort p-6">
            <h2 className="inline-block border-b-2 border-hjelm-500 pb-1 text-lg font-bold text-asfalt-900">
              {sektion.titel}
            </h2>
            <ul className="mt-3 space-y-2">
              {sektion.punkter.map((punkt, pi) => {
                const id = `${si}-${pi}`;
                const er = !!afkrydset[id];
                return (
                  <li key={id}>
                    <button
                      onClick={() => toggle(id)}
                      className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-asfalt-50"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-black ${
                          er
                            ? 'border-graes bg-graes text-white'
                            : 'border-asfalt-300 bg-white text-transparent'
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className={er ? 'text-asfalt-400 line-through' : 'text-asfalt-800'}>
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
    </div>
  );
}
