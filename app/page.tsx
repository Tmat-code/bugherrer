import Link from 'next/link';
import { queries } from '@/lib/db';
import { BEKRAEFT_TAERSKEL } from '@/lib/config';
import FejlListe from '@/components/FejlListe';

// Altid frisk fra databasen (ingen statisk caching af listen).
export const dynamic = 'force-dynamic';

export default function Forside({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const fejl = queries.alleFejlMedSvar.all();
  const startFilter =
    searchParams?.type === 'oenske' ? 'oenske' : searchParams?.type === 'fejl' ? 'fejl' : 'alle';

  const stats = queries.forsideStats.get({ taerskel: BEKRAEFT_TAERSKEL })!;
  const beskedTekst = queries.hentMeta.get('forside_besked')?.vaerdi ?? '';
  const beskedAktiv = queries.hentMeta.get('forside_besked_aktiv')?.vaerdi === '1';

  const tavle = [
    { n: stats.meldinger, label: 'meldte fejl', ikon: '📋' },
    { n: stats.bekraeftet, label: 'bekræftet af ejere', ikon: '✓' },
    { n: stats.sendt, label: 'sendt til Zeekr', ikon: '📮' },
    { n: stats.loest, label: 'løst', ikon: '✅' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl border-4 border-asfalt-900 bg-asfalt-900 text-white shadow-lg">
        <div className="h-3 w-full bg-advarselsstriber" aria-hidden />
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <h1 className="text-2xl font-black leading-tight sm:text-4xl">
            Velkommen til {''}
            <span className="text-hjelm-400">Bugherrer</span>
            <span className="ml-2" aria-hidden>🛠️</span>
          </h1>
          <p className="mt-3 max-w-2xl text-asfalt-200">
            Det uafhængige board for <strong className="text-white">Zeekr 7GT</strong>-ejere.
            Her samler vi de <em>&quot;bugherrer&quot;</em> (ja, det er sådan bil-appen oversætter{' '}
            <span className="font-mono text-hjelm-300">bugs</span> 😅) vi oplever — <strong className="text-white">og dine ønsker til ny funktionalitet</strong>.
            Vi stemmer dem op, bekræfter dem sammen, og sender de vigtigste videre til producenten.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/opret" className="btn-primary">
              🛠️ Meld en fejl
            </Link>
            <Link href="/opret?type=oenske" className="btn-secondary">
              💡 Foreslå et ønske
            </Link>
            <a href="#listen" className="btn-ghost !text-white hover:!bg-asfalt-700">
              Se listen ↓
            </a>
          </div>
        </div>
        <div className="h-3 w-full bg-advarselsstriber" aria-hidden />
      </section>

      {/* Admin-styret forside-besked (fx "rapporten er sendt til Zeekr") */}
      {beskedAktiv && beskedTekst && (
        <section className="mt-6 flex items-start gap-3 rounded-xl border-2 border-hjelm-500 bg-hjelm-50 px-5 py-4">
          <span className="text-2xl" aria-hidden>📣</span>
          <p className="font-bold text-asfalt-900">{beskedTekst}</p>
        </section>
      )}

      {/* Resultattavle: hvor langt er vi? */}
      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border-2 border-asfalt-200 bg-white sm:grid-cols-4 sm:divide-x-2 sm:divide-asfalt-100">
        {tavle.map((s, i) => (
          <div
            key={s.label}
            className={`px-4 py-4 text-center ${i < 2 ? 'border-b-2 border-asfalt-100 sm:border-b-0' : ''} ${
              i % 2 === 1 ? 'border-l-2 border-asfalt-100 sm:border-l-0' : ''
            }`}
          >
            <div className="text-3xl font-black text-asfalt-900">{s.n}</div>
            <div className="mt-0.5 text-xs font-bold uppercase tracking-wide text-asfalt-500">
              <span aria-hidden>{s.ikon}</span> {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Info-striber */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { ikon: '🔍', titel: 'Søg først', tekst: 'Findes din fejl allerede? Giv den en stemme.' },
          { ikon: '👷', titel: 'Bekræft sammen', tekst: 'Jo flere stemmer, jo tungere vejer fejlen.' },
          { ikon: '📮', titel: 'Send til Zeekr', tekst: 'De bekræftede fejl samles i en rapport.' },
        ].map((k) => (
          <div key={k.titel} className="kort flex items-center gap-3 p-4">
            <span className="text-2xl" aria-hidden>{k.ikon}</span>
            <div>
              <p className="font-bold text-asfalt-900">{k.titel}</p>
              <p className="text-sm text-asfalt-500">{k.tekst}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Listen */}
      <section id="listen" className="mt-10 scroll-mt-20">
        <FejlListe fejl={fejl} startFilter={startFilter} />
      </section>
    </div>
  );
}
