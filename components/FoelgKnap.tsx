'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Turnstile from '@/components/Turnstile';

// "🔔 Følg denne tråd" — virker ens på nye og gamle tråde: enhver kan taste sin mail
// og få besked ved ny status eller nyt svar. Ingen konto. Double opt-in, så der
// sendes en bekræft-mail først.
export default function FoelgKnap({ fejlId, type }: { fejlId: number; type: 'fejl' | 'oenske' }) {
  const ord = type === 'oenske' ? 'dette ønske' : 'denne fejl';
  const sp = useSearchParams();

  const [aaben, setAaben] = useState(false);
  const [email, setEmail] = useState('');
  const [sender, setSender] = useState(false);
  const [fejl, setFejl] = useState('');
  const [resultat, setResultat] = useState<'' | 'bekraeft_sendt' | 'allerede'>('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [netopBekraeftet, setNetopBekraeftet] = useState(false);

  // Kommer brugeren tilbage fra bekræft-linket (/fejl/ID?foelg=bekraeftet), så kvittér.
  useEffect(() => {
    if (sp.get('foelg') === 'bekraeftet') setNetopBekraeftet(true);
  }, [sp]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFejl('');
    setSender(true);
    try {
      const res = await fetch('/api/foelg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fejlId, email, turnstileToken, honeypot }),
      });
      const data = await res.json();
      if (res.ok) {
        setResultat(data.status === 'allerede' ? 'allerede' : 'bekraeft_sendt');
        try {
          localStorage.setItem(`foelger:${fejlId}`, '1');
        } catch {
          /* privat vindue e.l. — ligegyldigt */
        }
      } else {
        setFejl(data.error || 'Noget gik galt.');
      }
    } catch {
      setFejl('Kunne ikke få forbindelse.');
    } finally {
      setSender(false);
    }
  }

  if (netopBekraeftet) {
    return (
      <div className="mt-6 rounded-md border-2 border-hjelm-400 bg-hjelm-50 p-4 text-sm text-asfalt-800">
        <span className="font-bold">🔔 Tak — du følger nu {ord}.</span> Du får en mail,
        hver gang der kommer ny status eller et nyt svar. Hver mail har et afmeld-link.
      </div>
    );
  }

  if (resultat === 'bekraeft_sendt') {
    return (
      <div className="mt-6 rounded-md border-2 border-hjelm-400 bg-hjelm-50 p-4 text-sm text-asfalt-800">
        <span className="font-bold">📬 Tjek din indbakke.</span> Vi har sendt en mail — klik
        bekræft-linket, så er du tilmeldt. (Intet sker, før du klikker — så ingen kan tilmelde
        en andens adresse.)
      </div>
    );
  }

  if (resultat === 'allerede') {
    return (
      <div className="mt-6 rounded-md border-2 border-asfalt-200 bg-asfalt-50 p-4 text-sm text-asfalt-700">
        <span className="font-bold">✓ Du følger allerede {ord}.</span> Du får besked ved ny
        status og nye svar.
      </div>
    );
  }

  return (
    <div className="kort mt-6 p-5">
      {!aaben ? (
        <button
          onClick={() => setAaben(true)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block font-bold text-asfalt-900">🔔 Følg {ord}</span>
            <span className="block text-sm text-asfalt-500">
              Få en mail ved ny status eller nyt svar. Ingen konto — kun din mail.
            </span>
          </span>
          <span className="shrink-0 rounded-md bg-hjelm-400 px-3 py-1.5 text-sm font-bold text-asfalt-900">
            Følg
          </span>
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="foelg-email" className="label">
              🔔 Følg {ord} — din mail
            </label>
            <input
              id="foelg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="dig@eksempel.dk"
              className="input"
            />
            <p className="mt-1 text-xs text-asfalt-400">
              Bruges kun til notifikationer for denne tråd. Du kan afmelde fra hver mail.
            </p>
          </div>

          {/* Honeypot */}
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

          <Turnstile onToken={setTurnstileToken} />

          {fejl && <p className="text-sm font-bold text-murstensroed">{fejl}</p>}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setAaben(false)}
              className="text-sm font-bold text-asfalt-400 hover:text-asfalt-600"
            >
              Fortryd
            </button>
            <button type="submit" disabled={sender} className="btn-primary">
              {sender ? 'Tilmelder…' : 'Følg tråden'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
