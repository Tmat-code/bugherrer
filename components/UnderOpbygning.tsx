'use client';

import { useEffect, useState } from 'react';

// Tynd "under opbygning"-stribe lige under headeren. Informerer om, at sitet
// stadig bygges, og at korte nedetider kan forekomme. Kan lukkes (huskes pr.
// browser). Vises kun naar UNDER_OPBYGNING er slaaet til (server-side prop).
//
// Slaa fra i Coolify ved at saette UNDER_OPBYGNING=0 (kraever ingen kodeaendring).

const NOEGLE = 'bugherrer_underopbygning_skjult_v1';

export default function UnderOpbygning() {
  // Start skjult, saa der ikke "blinker" en bjaelke, foer vi har tjekket localStorage.
  const [vis, setVis] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(NOEGLE) === '1') return;
    } catch {
      /* ignore */
    }
    setVis(true);
  }, []);

  if (!vis) return null;

  return (
    <div className="border-b-2 border-asfalt-900 bg-hjelm-500 text-asfalt-900">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 text-sm">
        <span className="shrink-0 text-base" aria-hidden>🚧</span>
        <span className="flex-1 font-bold">
          Sitet er stadig under opbygning — kortvarige nedetider kan forekomme.
          Tak for tålmodigheden!
        </span>
        <button
          onClick={() => {
            try {
              localStorage.setItem(NOEGLE, '1');
            } catch {
              /* ignore */
            }
            setVis(false);
          }}
          className="shrink-0 rounded px-2 py-0.5 text-xs font-bold hover:bg-hjelm-400"
          aria-label="Luk besked"
        >
          Luk ✕
        </button>
      </div>
    </div>
  );
}
