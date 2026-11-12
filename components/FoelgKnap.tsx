'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Turnstile from '@/components/Turnstile';

// "🔔 Følg denne tråd" — virker ens på nye og gamle tråde: enhver kan taste sin mail
// og få besked ved ny status eller nyt svar. Ingen konto. Double opt-in, så der
// sendes en bekræft-mail først.
//
// Vedvarende "du følger"-hint: når en bruger HAR bekræftet i denne browser, husker vi
// det i localStorage og viser "Du følger denne tråd" ved senere besøg — i stedet for
// bare at give Følg-knappen igen. Det er bevidst KUN et browser-lokalt hint: browseren
// kender ikke mailadressen (sandheden ligger i databasen, koblet til mailen). Derfor
// gemmer vi intet før bekræftelse — har man ikke bekræftet, får man bare Følg-knappen
// igen, og det er helt trygt at følge påny (API'et dedupe'r på mail+tråd).
export default function FoelgKnap({ fejlId, type }: { fejlId: number; type: 'fejl' | 'oenske' }) {
  const ord = type === 'oenske' ? 'dette ønske' : 'denne fejl';
  const noegle = `foelger:${fejlId}`;
  const sp = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [foelger, setFoelger] = useState(false); // bekræftet følger i denne browser
  const [netopBekraeftet, setNetopBekraeftet] = useState(false);

  const [aaben, setAaben] = useState(false);
  const [email, setEmail] = useState('');
  const [sender, setSender] = useState(false);
  const [fejl, setFejl] = useState('');
  const [bekraeftSendt, setBekraeftSendt] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Efter mount: læs gemt status + håndtér retur fra bekræft-linket
  // (/fejl/ID?foelg=bekraeftet). mounted-flaget sikrer ens server-/klient-render
  // (begge viser Følg-knappen først), så der ingen hydration-mismatch er.
  useEffect(() => {
    setMounted(true);
    let ja = false;
    try {
      ja = localStorage.getItem(noegle) === 'ja';
    } catch {
      /* privat vindue e.l. */
    }
    if (sp.get('foelg') === 'bekraeftet') {
      ja = true;
      setNetopBekraeftet(true);
      try {
        localStorage.setItem(noegle, 'ja');
      } catch {
        /* ignorér */
      }
    }
    setFoelger(ja);
  }, [noegle, sp]);

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
        setAaben(false);
        if (data.status === 'allerede') {
          // Adressen var bekræftet i forvejen -> vis "du følger" med det samme.
          setFoelger(true);
          try {
            localStorage.setItem(noegle, 'ja');
          } catch {
            /* ignorér */
          }
        } else {
          // Ny tilmelding -> afventer bekræftelse (gemmer intet før bekræft-klik).
          setBekraeftSendt(true);
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

  // Bekræftet følger (vedvarende i denne browser).
  if (mounted && foelger) {
    return (
      <div className="mt-6 rounded-md border-2 border-hjelm-400 bg-hjelm-50 p-4 text-sm text-asfalt-800">
        {netopBekraeftet ? (
          <>
            <span className="font-bold">🔔 Tak — du følger nu {ord}.</span> Du får en mail,
            hver gang tråden får ny status eller et nyt svar.
          </>
        ) : (
          <>
            <span className="font-bold">🔔 Du følger {ord}.</span> Du får en mail ved ny
            status eller nyt svar. Afmeld-linket står i bunden af hver mail.
          </>
        )}
      </div>
    );
  }

  // Lige tilmeldt (denne session) — afventer bekræftelse i mailen.
  if (bekraeftSendt) {
    return (
      <div className="mt-6 rounded-md border-2 border-hjelm-400 bg-hjelm-50 p-4 text-sm text-asfalt-800">
        <span className="font-bold">📬 Tjek din indbakke.</span> Vi har sendt en mail — klik
        bekræft-linket, så er du tilmeldt. (Intet sker, før du klikker — så ingen kan tilmelde
        en andens adresse.)
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
