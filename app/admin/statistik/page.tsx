import Link from 'next/link';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import AdminLogin from '@/components/AdminLogin';

export const dynamic = 'force-dynamic';

const TZ = 'Europe/Copenhagen';
const UGEDAGE = [
  { en: 'Mon', da: 'Man' },
  { en: 'Tue', da: 'Tir' },
  { en: 'Wed', da: 'Ons' },
  { en: 'Thu', da: 'Tor' },
  { en: 'Fri', da: 'Fre' },
  { en: 'Sat', da: 'Lør' },
  { en: 'Sun', da: 'Søn' },
];

// Konverterer et tidsstempel til dansk tid og trækker dato, time og ugedag ud.
// Håndterer både SQLite-format ("2026-10-29 08:00:00") og ISO ("...T08:00:00.000Z").
// Returnerer null ved en ugyldig dato, så én dårlig række aldrig vælter siden.
function dkDele(ts: string): { dato: string; time: number; ugedag: string } | null {
  const norm = ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z';
  const d = new Date(norm);
  if (Number.isNaN(d.getTime())) return null;
  const dele = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(d);
  const g = (t: string) => dele.find((x) => x.type === t)?.value ?? '';
  return {
    dato: `${g('year')}-${g('month')}-${g('day')}`,
    time: Number(g('hour')) % 24,
    ugedag: g('weekday'),
  };
}

// Søjlehøjde i procent af chart-containeren. 0 → ingen søjle; ellers mindst 4% så en
// enkelt hændelse stadig er synlig.
function soejle(n: number, max: number): string {
  if (n <= 0) return '0%';
  return `${Math.max((n / max) * 100, 4)}%`;
}

export default function StatistikSide() {
  if (!erLoggetInd()) return <AdminLogin />;

  // Hent 90 dages aktivitet (UTC-grænse).
  const graense = new Date(Date.now() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  const raa = queries.aktivitetSiden.all(graense, graense, graense);

  // Buckets
  const perTime = Array<number>(24).fill(0);
  const perUgedag = Array<number>(7).fill(0);
  const perDagMap = new Map<string, number>();
  const antalType = { stemme: 0, kommentar: 0, fejl: 0 } as Record<string, number>;

  for (const r of raa) {
    const p = dkDele(r.oprettet);
    if (!p) continue;
    perTime[p.time]++;
    const ui = UGEDAGE.findIndex((u) => u.en === p.ugedag);
    if (ui >= 0) perUgedag[ui]++;
    perDagMap.set(p.dato, (perDagMap.get(p.dato) ?? 0) + 1);
    if (r.slags in antalType) antalType[r.slags]++;
  }

  // Sidste 30 dage (danske datoer), ældst → nyest.
  const sidste30: { dato: string; n: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dato = dkDele(new Date(Date.now() - i * 86_400_000).toISOString())?.dato ?? '';
    sidste30.push({ dato, n: perDagMap.get(dato) ?? 0 });
  }

  const totalAktivitet = raa.length;
  const maxTime = Math.max(1, ...perTime);
  const maxUgedag = Math.max(1, ...perUgedag);
  const maxDag = Math.max(1, ...sidste30.map((d) => d.n));

  // Mest/roligst tidspunkt (kun meningsfuldt med lidt data).
  const travlTime = perTime.indexOf(Math.max(...perTime));
  const roligTime = perTime.indexOf(Math.min(...perTime));

  const toCifret = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-asfalt-900">📈 Aktivitet</h1>
          <p className="text-sm text-asfalt-500">
            Stemmer, svar og nye bugherrer de sidste 90 dage — vist i dansk tid.
          </p>
        </div>
        <Link href="/admin" className="btn-ghost text-sm">
          ← Tilbage til admin
        </Link>
      </div>

      {/* Nøgletal */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tal tal={totalAktivitet} tekst="Hændelser i alt" ikon="⚡" />
        <Tal tal={antalType.stemme} tekst="Stemmer" ikon="▲" />
        <Tal tal={antalType.kommentar} tekst="Svar" ikon="💬" />
        <Tal tal={antalType.fejl} tekst="Nye bugherrer" ikon="🛠️" />
      </div>

      {totalAktivitet === 0 ? (
        <div className="kort mt-6 p-10 text-center text-asfalt-500">
          Der er ikke registreret aktivitet endnu. Kom igen, når der er kommet lidt gang i den. 👷
        </div>
      ) : (
        <>
          {/* Deploy-vindue-tip */}
          <div className="kort mt-6 border-l-4 border-hjelm-500 p-4 text-sm text-asfalt-700">
            🏗️ <strong>Travlest:</strong> omkring kl. {toCifret(travlTime)} ·{' '}
            <strong>Roligst:</strong> omkring kl. {toCifret(roligTime)}. De stille timer er
            det tryggeste tidspunkt at deploye (kort nedetid rammer færrest).
          </div>

          {/* Pr. klokkeslæt */}
          <section className="kort mt-6 p-6">
            <h2 className="text-lg font-bold text-asfalt-900">Hen over døgnet</h2>
            <p className="mt-0.5 text-xs text-asfalt-500">Hændelser pr. klokkeslæt (0–23).</p>
            <div className="mt-4 flex h-44 items-end gap-1">
              {perTime.map((n, t) => (
                <div
                  key={t}
                  className="flex-1 rounded-t bg-hjelm-500"
                  style={{ height: soejle(n, maxTime) }}
                  title={`kl. ${toCifret(t)}: ${n}`}
                />
              ))}
            </div>
            <div className="mt-1 flex gap-1 text-[9px] text-asfalt-400">
              {perTime.map((_, t) => (
                <div key={t} className="flex-1 text-center">
                  {t % 3 === 0 ? toCifret(t) : ''}
                </div>
              ))}
            </div>
          </section>

          {/* Pr. ugedag */}
          <section className="kort mt-6 p-6">
            <h2 className="text-lg font-bold text-asfalt-900">Hen over ugen</h2>
            <p className="mt-0.5 text-xs text-asfalt-500">Hændelser pr. ugedag.</p>
            <div className="mt-4 flex h-40 items-end gap-2">
              {perUgedag.map((n, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-asfalt-700"
                  style={{ height: soejle(n, maxUgedag) }}
                  title={`${UGEDAGE[i].da}: ${n}`}
                />
              ))}
            </div>
            <div className="mt-1 flex gap-2">
              {perUgedag.map((n, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="text-xs font-bold text-asfalt-500">{UGEDAGE[i].da}</div>
                  <div className="text-[10px] text-asfalt-400">{n}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Sidste 30 dage */}
          <section className="kort mt-6 p-6">
            <h2 className="text-lg font-bold text-asfalt-900">Sidste 30 dage</h2>
            <p className="mt-0.5 text-xs text-asfalt-500">Hændelser pr. dag.</p>
            <div className="mt-4 flex h-40 items-end gap-0.5">
              {sidste30.map((d) => (
                <div
                  key={d.dato}
                  className="flex-1 rounded-t bg-advarsel-500"
                  style={{ height: soejle(d.n, maxDag) }}
                  title={`${d.dato}: ${d.n}`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-asfalt-400">
              <span>{sidste30[0]?.dato.slice(5)}</span>
              <span>i dag</span>
            </div>
          </section>

          <p className="mt-6 text-xs leading-relaxed text-asfalt-500">
            💡 Dette er <strong>fællesskabs-aktivitet</strong> (stemmer/svar/meldinger) — ikke
            serverens CPU/hukommelse. Den egentlige server-belastning kan du se i Coolifys egen
            overvågning på applikationen.
          </p>
        </>
      )}
    </div>
  );
}

function Tal({ tal, tekst, ikon }: { tal: number; tekst: string; ikon: string }) {
  return (
    <div className="rounded-lg border-2 border-asfalt-200 bg-white p-3 text-center">
      <div className="text-2xl font-black text-asfalt-900">
        <span aria-hidden>{ikon}</span> {tal}
      </div>
      <div className="mt-0.5 text-xs font-bold text-asfalt-500">{tekst}</div>
    </div>
  );
}
