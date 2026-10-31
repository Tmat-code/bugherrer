'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TilmeldForm({
  token,
  navn,
  rolle,
}: {
  token: string;
  navn: string;
  rolle: string;
}) {
  const router = useRouter();
  const [kode, setKode] = useState('');
  const [gentag, setGentag] = useState('');
  const [fejl, setFejl] = useState('');
  const [sender, setSender] = useState(false);

  const rolleNavn = rolle === 'admin' ? 'administrator' : 'moderator';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    if (kode.length < 6) {
      setFejl('Kodeordet skal være mindst 6 tegn.');
      return;
    }
    if (kode !== gentag) {
      setFejl('De to kodeord er ikke ens.');
      return;
    }
    setSender(true);
    try {
      const res = await fetch('/api/tilmeld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, kode }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/admin'); // auto-logget ind
        router.refresh();
      } else {
        setFejl(data.error || 'Noget gik galt.');
        setSender(false);
      }
    } catch {
      setFejl('Kunne ikke få forbindelse.');
      setSender(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="kort p-8">
        <div className="text-center">
          <span className="text-4xl" aria-hidden>🔑</span>
          <h1 className="mt-3 text-xl font-black text-asfalt-900">Opret din adgang</h1>
          <p className="mt-1 text-sm text-asfalt-600">
            Hej <strong>{navn}</strong> — du er inviteret som{' '}
            <strong>{rolleNavn}</strong> på Bugherrer. Vælg et kodeord, så er du klar.
          </p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label htmlFor="kode" className="label">Vælg et kodeord (mindst 6 tegn)</label>
            <input
              id="kode"
              type="password"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              className="input"
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="gentag" className="label">Gentag kodeord</label>
            <input
              id="gentag"
              type="password"
              value={gentag}
              onChange={(e) => setGentag(e.target.value)}
              className="input"
              required
            />
          </div>
          {fejl && <p className="text-sm font-bold text-murstensroed">{fejl}</p>}
          <button type="submit" disabled={sender} className="btn-primary w-full">
            {sender ? 'Opretter…' : 'Opret adgang og log ind'}
          </button>
        </form>
      </div>
    </div>
  );
}
