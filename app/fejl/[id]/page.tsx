import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import StatusTag from '@/components/StatusTag';
import UpvoteKnap from '@/components/UpvoteKnap';
import Kommentarspor from '@/components/Kommentarspor';

export const dynamic = 'force-dynamic';

// Per-side metadata: hver bug får sin egen titel, beskrivelse, canonical og OG —
// godt for Google-indeksering og for deling af en konkret fejl.
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const id = Number(params.id);
  const fejl = Number.isInteger(id) ? queries.fejlById.get(id) : null;
  if (!fejl) return { title: 'Bugherre ikke fundet' };

  const beskrivelse =
    fejl.beskrivelse.replace(/\s+/g, ' ').trim().slice(0, 155) || fejl.titel;
  const ogTitel = `${fejl.titel} — ${fejl.bilmodel} ${fejl.softwareversion}`;

  return {
    title: fejl.titel,
    description: beskrivelse,
    alternates: { canonical: `/fejl/${fejl.id}` },
    openGraph: {
      type: 'article',
      url: `/fejl/${fejl.id}`,
      title: ogTitel,
      description: beskrivelse,
      images: ['/og.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitel,
      description: beskrivelse,
      images: ['/og.png'],
    },
  };
}

export default function FejlDetalje({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const fejl = queries.fejlById.get(id);
  if (!fejl) notFound();

  const kommentarer = queries.kommentarerForFejl.all(id);
  const bilBekraeftet = queries.antalEjerBekraeftet.get(id)!.n;

  function datoTekst(s: string) {
    return new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm font-bold text-asfalt-500 hover:text-hjelm-700">
        ← Tilbage til listen
      </Link>

      <article className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag status={fejl.status} />
          <span className="rounded bg-asfalt-100 px-2 py-0.5 text-xs font-bold text-asfalt-700">
            🚗 {fejl.bilmodel}
          </span>
          <span className="rounded bg-asfalt-100 px-2 py-0.5 font-mono text-xs text-asfalt-700">
            {fejl.softwareversion}
          </span>
          {fejl.telefon && (
            <span className="rounded bg-asfalt-100 px-2 py-0.5 text-xs font-bold text-asfalt-700">
              📱 {fejl.telefon}
              {fejl.telefon_os && (
                <span className="font-normal text-asfalt-500"> · {fejl.telefon_os}</span>
              )}
            </span>
          )}
          {!fejl.telefon && fejl.telefon_os && (
            <span className="rounded bg-asfalt-100 px-2 py-0.5 text-xs font-bold text-asfalt-700">
              📱 {fejl.telefon_os}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-black text-asfalt-900 sm:text-3xl">
          {fejl.titel}
        </h1>
        <p className="mt-1 text-sm text-asfalt-400">
          Meldt {datoTekst(fejl.oprettet)} · {fejl.stemmer} stemmer
          {bilBekraeftet > 0 && (
            <span className="font-bold text-asfalt-500"> · 🚗 {bilBekraeftet} bil-bekræftet</span>
          )}
        </p>

        {/* Beskrivelse */}
        <div className="kort mt-6 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-asfalt-400">
            Sådan genskabes fejlen
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-asfalt-800">{fejl.beskrivelse}</p>
        </div>

        {/* Upvote */}
        <div className="mt-6">
          <UpvoteKnap
            fejlId={fejl.id}
            startStemmer={fejl.stemmer}
            startBekraeftet={bilBekraeftet}
          />
        </div>

        {/* Kommentarer */}
        <Kommentarspor
          fejlId={fejl.id}
          kommentarer={kommentarer}
          loesningId={fejl.loesning_kommentar_id}
          erAdmin={erLoggetInd()}
          erLoest={fejl.status === 'Løst!'}
        />
      </article>
    </div>
  );
}
