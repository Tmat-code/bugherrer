'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [kodeord, setKodeord] = useState('');
  const [fejl, setFejl] = useState('');
  const [sender, setSender] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    setSender(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kodeord }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setFejl('Forkert kodeord. Prøv igen.');
        setSender(false);
      }
    } catch {
      setFejl('Kunne ikke få forbindelse.');
      setSender(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="kort p-8 text-center">
        <span className="text-4xl" aria-hidden>🔐</span>
        <h1 className="mt-3 text-xl font-black text-asfalt-900">Admin-adgang</h1>
        <p className="mt-1 text-sm text-asfalt-500">Kun for byggepladsens formand.</p>
        <form onSubmit={submit} className="mt-6 space-y-3 text-left">
          <div>
            <label htmlFor="kodeord" className="label">Kodeord</label>
            <input
              id="kodeord"
              type="password"
              value={kodeord}
              onChange={(e) => setKodeord(e.target.value)}
              className="input"
              autoFocus
              required
            />
          </div>
          {fejl && <p className="text-sm font-bold text-murstensroed">{fejl}</p>}
          <button type="submit" disabled={sender} className="btn-primary w-full">
            {sender ? 'Logger ind…' : 'Log ind'}
          </button>
        </form>
      </div>
    </div>
  );
}
