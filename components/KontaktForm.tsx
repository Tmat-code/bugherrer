'use client';

import { useState } from 'react';
import Turnstile from '@/components/Turnstile';

export default function KontaktForm() {
  const [navn, setNavn] = useState('');
  const [email, setEmail] = useState('');
  const [besked, setBesked] = useState('');
  const [sender, setSender] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [fejl, setFejl] = useState('');
  // Spam-værn: Turnstile-token + honeypot.
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    setSender(true);
    try {
      const res = await fetch('/api/kontakt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navn, email, besked, turnstileToken, honeypot }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendt(true);
      } else {
        setFejl(data.error || 'Noget gik galt.');
      }
    } catch {
      setFejl('Kunne ikke få forbindelse. Prøv igen.');
    } finally {
      setSender(false);
    }
  }

  if (sendt) {
    return (
      <div className="kort p-8 text-center">
        <p className="text-4xl" aria-hidden>✅</p>
        <p className="mt-3 text-lg font-bold text-asfalt-900">Tak for din henvendelse!</p>
        <p className="mt-1 text-sm text-asfalt-500">
          Den er landet hos formanden. Skrev du en e-mail, vender han tilbage, når han kan.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="kort space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="k-navn" className="label">Navn (valgfrit)</label>
          <input
            id="k-navn"
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            placeholder="Dit navn"
            maxLength={80}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="k-email" className="label">E-mail (så du kan få svar)</label>
          <input
            id="k-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dig@eksempel.dk"
            maxLength={120}
            className="input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="k-besked" className="label">Din besked *</label>
        <textarea
          id="k-besked"
          value={besked}
          onChange={(e) => setBesked(e.target.value)}
          rows={5}
          required
          className="input"
          placeholder="Hvad har du på hjerte? Ris, ros, en idé, eller noget der driller på siden."
        />
        <p className="mt-1 text-xs text-asfalt-400">{besked.length} tegn</p>
      </div>

      {/* Honeypot: usynligt for mennesker, bots udfylder det. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      {/* Usynlig captcha (vises kun hvis værnet er sat op). */}
      <Turnstile onToken={setTurnstileToken} />

      {fejl && (
        <p className="rounded-md border-2 border-murstensroed bg-red-50 p-3 text-sm font-bold text-murstensroed">
          {fejl}
        </p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={sender} className="btn-primary">
          {sender ? 'Sender…' : '📨 Send til formanden'}
        </button>
      </div>
    </form>
  );
}
