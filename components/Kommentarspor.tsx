'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Kommentar } from '@/lib/db';
import { markerSet } from '@/lib/svar-set';
import Turnstile from '@/components/Turnstile';

export default function Kommentarspor({
  fejlId,
  kommentarer,
  loesningId,
  erAdmin,
  erLoest,
}: {
  fejlId: number;
  kommentarer: Kommentar[];
  loesningId: number | null;
  erAdmin: boolean;
  erLoest: boolean;
}) {
  const router = useRouter();
  const [navn, setNavn] = useState('');
  const [tekst, setTekst] = useState('');
  const [sender, setSender] = useState(false);
  const [fejl, setFejl] = useState('');
  // Spam-værn: Turnstile-token + honeypot.
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loesningTravl, setLoesningTravl] = useState(false);
  const [visAlle, setVisAlle] = useState(false);
  // Moderation (admin + moderator): slet / ret en kommentar.
  const [modTravl, setModTravl] = useState(false);
  const [redigerId, setRedigerId] = useState<number | null>(null);
  const [redigerTekst, setRedigerTekst] = useState('');

  const loesning = loesningId ? kommentarer.find((k) => k.id === loesningId) : undefined;
  const ovrige = kommentarer.filter((k) => k.id !== loesningId);
  // Fold lange tråde sammen: vis de nyeste 3, med en "Vis alle"-knap.
  const skalFolde = ovrige.length > 4 && !visAlle;
  const visteOvrige = skalFolde ? ovrige.slice(-3) : ovrige;

  async function saetLoesning(kommentarId: number | null) {
    setLoesningTravl(true);
    try {
      const res = await fetch('/api/loesning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fejlId, kommentarId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Kunne ikke opdatere løsningen.');
      }
    } catch {
      alert('Kunne ikke få forbindelse.');
    } finally {
      setLoesningTravl(false);
    }
  }

  async function sletKommentar(id: number) {
    if (!confirm('Slet denne kommentar? Det kan ikke fortrydes.')) return;
    setModTravl(true);
    try {
      const res = await fetch('/api/admin/slet-kommentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) router.refresh();
      else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Kunne ikke slette kommentaren.');
      }
    } catch {
      alert('Kunne ikke få forbindelse.');
    } finally {
      setModTravl(false);
    }
  }

  function startRet(k: Kommentar) {
    setRedigerId(k.id);
    setRedigerTekst(k.tekst);
  }

  async function gemRet() {
    if (redigerId == null) return;
    setModTravl(true);
    try {
      const res = await fetch('/api/admin/rediger-kommentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: redigerId, tekst: redigerTekst }),
      });
      if (res.ok) {
        setRedigerId(null);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Kunne ikke gemme ændringen.');
      }
    } catch {
      alert('Kunne ikke få forbindelse.');
    } finally {
      setModTravl(false);
    }
  }

  // Moderations-knapper (Ret/Slet) — vises kun for admin/moderator.
  function modKnapper(k: Kommentar) {
    if (!erAdmin) return null;
    return (
      <span className="ml-auto flex gap-3">
        <button
          onClick={() => startRet(k)}
          disabled={modTravl}
          className="text-xs font-bold text-asfalt-500 hover:text-hjelm-700"
        >
          ✏️ Ret
        </button>
        <button
          onClick={() => sletKommentar(k.id)}
          disabled={modTravl}
          className="text-xs font-bold text-asfalt-500 hover:text-murstensroed"
        >
          🗑️ Slet
        </button>
      </span>
    );
  }

  // Inline redigerings-felt til en kommentar.
  function redigerFelt() {
    return (
      <div className="mt-2">
        <textarea
          value={redigerTekst}
          onChange={(e) => setRedigerTekst(e.target.value)}
          rows={3}
          className="input"
        />
        <div className="mt-2 flex justify-end gap-3">
          <button
            onClick={() => setRedigerId(null)}
            className="text-xs font-bold text-asfalt-400 hover:text-asfalt-600"
          >
            Annullér
          </button>
          <button onClick={gemRet} disabled={modTravl} className="btn-primary !px-3 !py-1.5 text-sm">
            {modTravl ? 'Gemmer…' : 'Gem'}
          </button>
        </div>
      </div>
    );
  }

  // Når fejlen vises (og efter nye svar), markér svarene som set i denne browser,
  // saa "nyt svar"-markeringen paa forsiden nulstilles.
  useEffect(() => {
    markerSet(fejlId, kommentarer.length);
  }, [fejlId, kommentarer.length]);

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

      {/* Løsning — pinnet øverst */}
      {loesning && (
        <div className="mt-4 rounded-md border-2 border-graes bg-green-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-graes px-2 py-0.5 text-xs font-black text-white">
              ✅ LØSNING
            </span>
            {erAdmin && (
              <button
                onClick={() => saetLoesning(null)}
                disabled={loesningTravl}
                className="text-xs font-bold text-asfalt-500 hover:text-murstensroed"
              >
                Fjern løsning
              </button>
            )}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-bold text-asfalt-800">{loesning.navn}</span>
            <span className="text-xs text-asfalt-400">{datoTekst(loesning.oprettet)}</span>
          </div>
          {redigerId === loesning.id ? (
            redigerFelt()
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-asfalt-700">{loesning.tekst}</p>
              {erAdmin && <div className="mt-2 flex">{modKnapper(loesning)}</div>}
            </>
          )}
        </div>
      )}

      {/* Eksisterende kommentarer */}
      <ul className="mt-4 space-y-3">
        {kommentarer.length === 0 && (
          <li className="rounded-md bg-asfalt-50 p-4 text-sm text-asfalt-500">
            Ingen kommentarer endnu. Vær den første til at grave i den. 👷
          </li>
        )}
        {skalFolde && (
          <li>
            <button
              onClick={() => setVisAlle(true)}
              className="w-full rounded-md border-2 border-dashed border-asfalt-200 py-2 text-sm font-bold text-asfalt-600 hover:border-hjelm-400"
            >
              ↕ Vis alle {ovrige.length} svar
            </button>
          </li>
        )}
        {visteOvrige.map((k) => (
          <li key={k.id} className="rounded-md border-l-4 border-hjelm-500 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-asfalt-800">{k.navn}</span>
              <span className="text-xs text-asfalt-400">{datoTekst(k.oprettet)}</span>
            </div>
            {redigerId === k.id ? (
              redigerFelt()
            ) : (
              <>
                <p className="mt-1 whitespace-pre-wrap text-asfalt-700">{k.tekst}</p>
                <div className="mt-2 flex items-center gap-3">
                  {(!loesning || erAdmin) && (
                    <button
                      onClick={() => saetLoesning(k.id)}
                      disabled={loesningTravl}
                      className="text-xs font-bold text-green-700 hover:underline"
                    >
                      ✅ Markér som løsning
                    </button>
                  )}
                  {modKnapper(k)}
                </div>
              </>
            )}
          </li>
        ))}
        {visAlle && ovrige.length > 4 && (
          <li>
            <button
              onClick={() => setVisAlle(false)}
              className="text-xs font-bold text-asfalt-400 hover:text-asfalt-600"
            >
              ↑ Vis færre
            </button>
          </li>
        )}
      </ul>

      {/* Løst-notits: tråden holdes bevidst åben, saa regressioner kan meldes. */}
      {erLoest && (
        <div className="mt-5 rounded-md border-2 border-graes bg-green-50 p-4 text-sm text-asfalt-700">
          <span className="font-bold">✅ Denne bugherre er markeret som løst.</span>{' '}
          Er fejlen vendt tilbage — fx efter en softwareopdatering? Så skriv endelig
          herunder, så kigger vi på at genåbne den.
        </div>
      )}

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
