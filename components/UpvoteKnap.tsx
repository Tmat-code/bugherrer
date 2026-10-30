'use client';

import { useState } from 'react';
import { ZEEKR_VARIANTER } from '@/lib/config';

export default function UpvoteKnap({
  fejlId,
  startStemmer,
  startBekraeftet = 0,
  type = 'fejl',
}: {
  fejlId: number;
  startStemmer: number;
  startBekraeftet?: number;
  type?: 'fejl' | 'oenske';
}) {
  const [stemmer, setStemmer] = useState(startStemmer);
  const [stemt, setStemt] = useState(false);
  const [venter, setVenter] = useState(false);

  // Bil-bekraeftelse (efter stemme)
  const [bekraeftet, setBekraeftet] = useState(startBekraeftet);
  const [visBekraeft, setVisBekraeft] = useState(false);
  const [minVariant, setMinVariant] = useState<string | null>(null);
  const [bekraeftVenter, setBekraeftVenter] = useState(false);

  async function upvote() {
    if (stemt || venter) return;
    setVenter(true);
    setStemmer((n) => n + 1);
    setStemt(true);
    try {
      const res = await fetch('/api/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fejlId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStemmer(data.stemmer);
        setVisBekraeft(true); // tilbyd bil-bekraeftelse lige efter stemmen
      } else {
        setStemmer((n) => n - 1);
        setStemt(false);
      }
    } catch {
      setStemmer((n) => n - 1);
      setStemt(false);
    } finally {
      setVenter(false);
    }
  }

  async function bekraeft(variant: string) {
    if (bekraeftVenter) return;
    setBekraeftVenter(true);
    try {
      const res = await fetch('/api/bekraeft-ejer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fejlId, variant }),
      });
      const data = await res.json();
      if (res.ok) {
        setMinVariant(variant);
        if (typeof data.antal === 'number') setBekraeftet(data.antal);
        setVisBekraeft(false);
      }
    } finally {
      setBekraeftVenter(false);
    }
  }

  return (
    <div>
      <button
        onClick={upvote}
        disabled={stemt}
        className={`flex w-full items-center justify-center gap-3 rounded-lg border-2 px-6 py-4 text-lg font-black transition-colors ${
          stemt
            ? 'border-hjelm-500 bg-hjelm-100 text-asfalt-800'
            : 'border-hjelm-500 bg-hjelm-500 text-asfalt-900 hover:bg-hjelm-400'
        }`}
      >
        <span aria-hidden>▲</span>
        {stemt
          ? 'Tak — du har stemt!'
          : type === 'oenske'
            ? 'Ønsker du også dette?'
            : 'Oplever du også dette?'}
        <span className="rounded bg-asfalt-900/10 px-2 py-0.5">{stemmer}</span>
      </button>

      {/* Bil-bekraeftelse: vises lige efter stemmen, kan springes over */}
      {visBekraeft && !minVariant && (
        <div className="mt-3 rounded-lg border-2 border-asfalt-200 bg-asfalt-50 p-4">
          <p className="text-sm font-bold text-asfalt-800">
            🚗 Ejer du selv en Zeekr 7GT?
          </p>
          <p className="mt-0.5 text-xs text-asfalt-500">
            Vælg din variant — så tæller din stemme som <strong>bil-bekræftet</strong>,
            og listen bliver stærkere, når den sendes til Zeekr. (Vi gemmer kun varianten,
            intet andet.)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ZEEKR_VARIANTER.map((v) => (
              <button
                key={v}
                onClick={() => bekraeft(v)}
                disabled={bekraeftVenter}
                className="rounded-lg border-2 border-asfalt-300 bg-white px-3 py-1.5 text-sm font-bold text-asfalt-800 transition-colors hover:border-hjelm-500 hover:bg-hjelm-50 disabled:opacity-50"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Kvittering + samlet tal */}
      {minVariant && (
        <p className="mt-3 rounded-lg border-2 border-graes bg-green-50 p-3 text-sm font-bold text-asfalt-700">
          ✅ Tak — din stemme tæller nu som bil-bekræftet ({minVariant}).
        </p>
      )}
      {!minVariant && bekraeftet > 0 && (
        <p className="mt-2 text-xs font-bold text-asfalt-500">
          🚗 {bekraeftet} bil-bekræftet
        </p>
      )}
    </div>
  );
}
