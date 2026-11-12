'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AfmeldKnap({ token }: { token: string }) {
  const [tilstand, setTilstand] = useState<'klar' | 'travl' | 'afmeldt'>('klar');

  async function afmeld() {
    setTilstand('travl');
    try {
      await fetch('/api/foelg/afmeld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch {
      /* idempotent — vis afmeldt uanset, så brugeren ikke sidder fast */
    }
    setTilstand('afmeldt');
  }

  if (tilstand === 'afmeldt') {
    return (
      <div className="kort p-6 text-center">
        <p className="text-lg font-bold text-asfalt-900">✓ Du er afmeldt</p>
        <p className="mt-2 text-sm text-asfalt-600">
          Du får ikke flere notifikationer for denne tråd. Du kan altid følge den igen senere.
        </p>
        <Link href="/" className="btn-primary mt-4 inline-block">
          Til forsiden
        </Link>
      </div>
    );
  }

  return (
    <div className="kort p-6 text-center">
      <p className="text-asfalt-700">
        Vil du stoppe notifikationer for denne tråd?
      </p>
      <button
        onClick={afmeld}
        disabled={tilstand === 'travl'}
        className="btn-primary mt-4"
      >
        {tilstand === 'travl' ? 'Afmelder…' : 'Ja, afmeld mig'}
      </button>
      <div className="mt-3">
        <Link href="/" className="text-sm font-bold text-asfalt-500 hover:text-hjelm-700">
          Nej, behold tilmeldingen
        </Link>
      </div>
    </div>
  );
}
