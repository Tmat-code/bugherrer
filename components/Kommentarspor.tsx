'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Kommentar } from '@/lib/db';
import Turnstile from '@/components/Turnstile';

export default function Kommentarspor({
  fejlId,
  kommentarer,
}: {
  fejlId: number;
  kommentarer: Kommentar[];
}) {
  const router = useRouter();
  const [navn, setNavn] = useState('');
  const [tekst, setTekst] = useState('');
  const [sender, setSender] = useState(false);
  const [fejl, setFejl] = useState('');
  // Spam-værn: Turnstile-token + honeypot.
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    setSender(true);
    try {
      const res = await fetch('/api/kommentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fejlId, navn, tekst, turnstileToken, honeypot }),
      });
      const data = await res.json();
      if (res.ok) {
        setTekst('');
        router.refresh(); // genindlaes server-komponenten med den nye kommentar
      } else {
        setFejl(data.error || 'Noget gik galt.');
      }
    } catch {
      setFejl('Kunne ikke få forbindelse.');
    } finally {
      setSender(false);
    }
  }

  function datoTekst(s: string) {
    // SQLite gemmer UTC; vis paent paa dansk.
    return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('da-DK', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-asfalt-900">
        💬 Byggemøde ({kommentarer.length})
      </h2>
      <p className="mt-1 text-sm text-asfalt-500">
        Er det en betjeningsfejl, eller har du et fix? Hjælp de andre her — så
        slipper admin for at blande sig.
      </p>

      {/* Eksisterende kommentarer */}
      <ul className="mt-4 space-y-3">
        {kommentarer.length === 0 && (
          <li className="rounded-md bg-asfalt-50 p-4 text-sm text-asfalt-500">
            Ingen kommentarer endnu. Vær den første til at grave i den. 👷
          </li>
        )}
        {kommentarer.map((k) => (
          <li key={k.id} className="rounded-md border-l-4 border-hjelm-500 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-asfalt-800">{k.navn}</span>
              <span className="text-xs text-asfalt-400">{datoTekst(k.oprettet)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-asfalt-700">{k.tekst}</p>
          </li>
        ))}
      </ul>

      {/* Ny kommentar */}
      <form onSubmit={submit} className="kort mt-5 space-y-3 p-5">
        <div>
          <label htmlFor="k-navn" className="label">Navn (valgfrit)</label>
          <input
            id="k-navn"
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            placeholder="Anonym bygmester"
            maxLength={40}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="k-tekst" className="label">Din kommentar *</label>
          <textarea
            id="k-tekst"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            rows={3}
            required
            className="input"
            placeholder="Fx: 'Dette er faktisk en indstilling — gå ind i menuen under…'"
          />
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

        {fejl && <p className="text-sm font-bold text-murstensroed">{fejl}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={sender} className="btn-primary">
            {sender ? 'Sender…' : 'Skriv i byggemødet'}
          </button>
        </div>
      </form>
    </section>
  );
}
