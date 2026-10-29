import Link from 'next/link';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import AdminLogin from '@/components/AdminLogin';
import RydStemmer from '@/components/RydStemmer';

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

// Sekunder mellem to tidsstempler ("YYYY-MM-DD HH:MM:SS", UTC). Negativ/NaN → 0.
function spanSek(a: string, b: string): number {
  const ta = Date.parse(a.replace(' ', 'T') + 'Z');
  const tb = Date.parse(b.replace(' ', 'T') + 'Z');
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.max(0, (tb - ta) / 1000);
}

function kortSpan(sek: number): string {
  if (sek < 60) return `${Math.round(sek)}s`;
  if (sek < 3600) return `${Math.round(sek / 60)} min`;
  if (sek < 86400) return `${Math.round(sek / 3600)} t`;
  return `${Math.round(sek / 86400)} d`;
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

  // --- Snyd-detektion ---
  // Pr. token: flag hvis FLERE forskellige varianter bekræftet (én person = én bil),
  // eller mange stemmer i et meget kort vindue (ikke menneskeligt læsetempo).
  const tokenRows = queries.tokenAktivitet.all();
  const tokenAnalyse = tokenRows.map((t) => {
    const span = spanSek(t.foerste, t.sidste);
    const flereVarianter = t.distinkte_varianter > 1;
    const hurtigtBurst = t.stemmer >= 8 && span < 120;
    return { ...t, span, flereVarianter, hurtigtBurst, flag: flereVarianter || hurtigtBurst };
  });
  const flaggede = tokenAnalyse.filter((t) => t.flag).slice(0, 25);
  const travleste = [...tokenAnalyse].sort((a, b) => b.stemmer - a.stemmer).slice(0, 6);

  // "med" -> variant: hvor hurtigt vælges varianten efter stemmen?
  const tider = queries.bekraeftelsesTider.all();
  const delays = tider.map((r) => spanSek(r.oprettet, r.tid));
  const antalBekr = delays.length;
  const lynhurtige = delays.filter((d) => d < 2).length; // under 2 sek
  const medianDelay =
    antalBekr > 0 ? [...delays].sort((a, b) => a - b)[Math.floor(antalBekr / 2)] : null;

  const idagDato = dkDele(new Date().toISOString())?.dato ?? '';

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
            <div className="mt-4 flex h-44 items-end gap-1 border-b-2 border-asfalt-200">
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
            <div className="mt-4 flex h-40 items-end gap-2 border-b-2 border-asfalt-200">
              {perUgedag.map((n, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-hjelm-500"
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
            <div className="mt-4 flex h-40 items-end gap-0.5 border-b-2 border-asfalt-200">
              {sidste30.map((d) => (
                <div
                  key={d.dato}
                  className="flex-1 rounded-t bg-hjelm-500"
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

      {/* Mistænkelig aktivitet */}
      <section className="kort mt-6 p-6">
        <h2 className="text-lg font-bold text-asfalt-900">🕵️ Mistænkelig aktivitet</h2>
        <p className="mt-0.5 text-xs text-asfalt-500">
          Indbygget spærre: én browser = én stemme + én bekræftelse pr. bug. Så en enkelt
          person kan ikke puste én bug op alene — det kræver mange browsere/inkognito. Her er
          signalerne på det.
        </p>

        {/* med -> variant timing */}
        <div className="mt-4 rounded-lg border-2 border-asfalt-200 bg-asfalt-50 p-4 text-sm">
          <p className="font-bold text-asfalt-800">⏱️ Hvor hurtigt vælges variant efter “med”?</p>
          {antalBekr === 0 ? (
            <p className="mt-1 text-asfalt-500">Ingen bil-bekræftelser med tidsstempel endnu.</p>
          ) : (
            <p className="mt-1 text-asfalt-600">
              {antalBekr} bekræftelser · median{' '}
              <strong>{medianDelay !== null ? kortSpan(medianDelay) : '—'}</strong> · heraf{' '}
              <strong className={lynhurtige > 0 ? 'text-murstensroed' : ''}>
                {lynhurtige} lynhurtige (&lt;2s)
              </strong>
              . Mange lynhurtige kan tyde på scriptede klik.
            </p>
          )}
        </div>

        {/* Flaggede tokens */}
        <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-asfalt-400">
          Flaggede browsere
        </h3>
        {flaggede.length === 0 ? (
          <p className="mt-2 rounded-md bg-green-50 p-3 text-sm font-bold text-asfalt-700">
            ✅ Intet mistænkeligt lige nu.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-asfalt-200 text-left text-asfalt-500">
                  <th className="p-2">Browser</th>
                  <th className="p-2">Stemmer</th>
                  <th className="p-2">Bekr.</th>
                  <th className="p-2">Varianter</th>
                  <th className="p-2">Tidsspan</th>
                  <th className="p-2">Flag</th>
                </tr>
              </thead>
              <tbody>
                {flaggede.map((t) => (
                  <tr key={t.token} className="border-b border-asfalt-100">
                    <td className="p-2 font-mono text-xs text-asfalt-500">{t.token.slice(0, 8)}…</td>
                    <td className="p-2 font-bold">{t.stemmer}</td>
                    <td className="p-2">{t.bekraeftelser}</td>
                    <td className="p-2">{t.distinkte_varianter}</td>
                    <td className="p-2">{kortSpan(t.span)}</td>
                    <td className="p-2 text-xs font-bold text-murstensroed">
                      {[
                        t.flereVarianter ? 'flere varianter' : '',
                        t.hurtigtBurst ? 'hurtigt burst' : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Travleste tokens (info) */}
        {travleste.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-asfalt-400">
              Travleste browsere (info)
            </h3>
            <p className="mt-2 text-xs text-asfalt-500">
              Mange stemmer fra samme browser er helt fint, hvis det er spredt over tid og én
              variant (en ejer med mange fejl). Hold øje med korte tidsspan.
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {travleste.map((t) => (
                <li key={t.token} className="flex flex-wrap gap-x-3 text-asfalt-600">
                  <span className="font-mono text-xs text-asfalt-400">{t.token.slice(0, 8)}…</span>
                  <span>
                    <strong>{t.stemmer}</strong> stemmer
                  </span>
                  <span>{t.bekraeftelser} bekr.</span>
                  <span>{t.distinkte_varianter} variant(er)</span>
                  <span>over {kortSpan(t.span)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Oprydning */}
      <section className="kort mt-6 p-6">
        <h2 className="text-lg font-bold text-asfalt-900">🧹 Oprydning</h2>
        <p className="mt-0.5 text-xs text-asfalt-500">
          Fjern “med”-klik (stemmer) fra før en dato — fx test-klik fra før lanceringen. Viser
          antal først; sletning retter stemmetallene og kan ikke fortrydes.
        </p>
        <RydStemmer standardDato={idagDato} />
      </section>
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
