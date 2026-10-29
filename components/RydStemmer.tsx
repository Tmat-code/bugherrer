'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Oprydningsværktøj: fjern "med"-klik (stemmer) FØR en valgt dato. Viser antal først,
// og retter stemmetallene ved sletning. Beregnet til at rydde pre-launch-testklik.
export default function RydStemmer({ standardDato }: { standardDato: string }) {
  const router = useRouter();
  const [dato, setDato] = useState(standardDato);
  const [antal, setAntal] = useState<number | null>(null);
  const [travl, setTravl] = useState(false);
  const [besked, setBesked] = useState('');

  async function visAntal() {
    setBesked('');
    setAntal(null);
    setTravl(true);
    try {
      const res = await fetch('/api/admin/ryd-stemmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foerDato: dato }),
      });
      const data = await res.json();
      if (res.ok) setAntal(data.antal);
      else setBesked(data.error || 'Noget gik galt.');
    } catch {
      setBesked('Kunne ikke få forbindelse.');
    } finally {
      setTravl(false);
    }
  }

  async function fjern() {
    if (
      !confirm(
        `Fjern alle ${antal ?? ''} stemmer fra FØR ${dato} permanent?\n\n` +
          'Stemmetallene rettes tilsvarende. Dette kan ikke fortrydes.'
      )
    )
      return;
    setTravl(true);
    setBesked('');
    try {
      const res = await fetch('/api/admin/ryd-stemmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foerDato: dato, bekraeft: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setBesked(`✅ Fjernede ${data.slettet} stemmer fra før ${dato}.`);
        setAntal(0);
        router.refresh();
      } else {
        setBesked(data.error || 'Noget gik galt.');
      }
    } catch {
      setBesked('Kunne ikke få forbindelse.');
    } finally {
      setTravl(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="ryd-dato" className="label">
          Fjern stemmer før
        </label>
        <input
          id="ryd-dato"
          type="date"
          value={dato}
          onChange={(e) => {
            setDato(e.target.value);
            setAntal(null);
            setBesked('');
          }}
          className="input !w-44"
        />
      </div>
      <button onClick={visAntal} disabled={travl} className="btn-ghost text-sm">
        {travl ? '…' : 'Vis antal'}
      </button>
      {antal !== null && (
        <>
          <span className="text-sm font-bold text-asfalt-700">
            {antal} stemmer før {dato}
          </span>
          {antal > 0 && (
            <button
              onClick={fjern}
              disabled={travl}
              className="rounded-lg border-2 border-murstensroed px-3 py-1.5 text-sm font-bold text-murstensroed hover:bg-red-50"
            >
              🗑️ Fjern dem
            </button>
          )}
        </>
      )}
      {besked && <p className="w-full text-sm font-bold text-asfalt-700">{besked}</p>}
    </div>
  );
}
