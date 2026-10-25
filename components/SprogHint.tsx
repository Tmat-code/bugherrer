'use client';

import { useEffect, useState } from 'react';

// En lille bjælke der (kun for ikke-danske browsere) foreslår at bruge browserens
// egen oversæt-funktion. Vi kan ikke udløse "oversæt siden" via JS, så vi nudger.
// Kan lukkes; valget huskes pr. browser.

const NOEGLE = 'bugherrer_sproghint_skjult_v1';

const BESKED: Record<string, string> = {
  sv: '🌍 Den här sidan är på danska. Använd din webbläsares översättningsfunktion för att läsa den på ditt språk.',
  no: '🌍 Denne siden er på dansk. Bruk nettleserens oversettelsesfunksjon for å lese den på ditt språk.',
  en: "🌍 This board is in Danish. Use your browser's translate feature to read it in your language.",
};
const LUK: Record<string, string> = { sv: 'Stäng', no: 'Lukk', en: 'Dismiss' };

function vaelgSprog(lang: string): keyof typeof BESKED | null {
  const l = (lang || '').toLowerCase();
  if (l.startsWith('da')) return null; // dansk browser: intet hint
  if (l.startsWith('sv')) return 'sv';
  if (l.startsWith('no') || l.startsWith('nb') || l.startsWith('nn')) return 'no';
  return 'en';
}

export default function SprogHint() {
  const [sprog, setSprog] = useState<keyof typeof BESKED | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(NOEGLE) === '1') return;
    } catch {
      /* ignore */
    }
    setSprog(vaelgSprog(navigator.language));
  }, []);

  if (!sprog) return null;

  return (
    <div className="border-b-2 border-asfalt-900 bg-hjelm-500 text-asfalt-900">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 text-sm">
        <span className="flex-1">{BESKED[sprog]}</span>
        <button
          onClick={() => {
            try {
              localStorage.setItem(NOEGLE, '1');
            } catch {
              /* ignore */
            }
            setSprog(null);
          }}
          className="shrink-0 rounded px-2 py-0.5 text-xs font-bold hover:bg-hjelm-400"
        >
          {LUK[sprog]} ✕
        </button>
      </div>
    </div>
  );
}
