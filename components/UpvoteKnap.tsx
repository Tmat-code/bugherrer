'use client';

import { useState } from 'react';

export default function UpvoteKnap({
  fejlId,
  startStemmer,
}: {
  fejlId: number;
  startStemmer: number;
}) {
  const [stemmer, setStemmer] = useState(startStemmer);
  const [stemt, setStemt] = useState(false);
  const [venter, setVenter] = useState(false);

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

  return (
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
      {stemt ? 'Tak — du har stemt!' : 'Oplever du også dette?'}
      <span className="rounded bg-asfalt-900/10 px-2 py-0.5">{stemmer}</span>
    </button>
  );
}
