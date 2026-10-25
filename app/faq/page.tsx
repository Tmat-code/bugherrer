import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ & spilleregler — Bugherrer',
  description:
    'Sådan virker Bugherrer, og hvordan vi opfører os over for hinanden. Spørgsmål, svar og spilleregler for fejl-boardet.',
};

type Punkt = { sp: string; sv: React.ReactNode };

const SAADAN_VIRKER: Punkt[] = [
  {
    sp: 'Hvad er Bugherrer?',
    sv: (
      <>
        Et uafhængigt fejl-board for <strong>Zeekr 7GT</strong>-ejere. Vi samler de
        softwarefejl (&quot;bugherrer&quot;), som vi oplever, stemmer dem op sammen, og
        sender de mest bekræftede videre til Zeekr. Jo flere der bekræfter en fejl, jo
        tungere vejer den.
      </>
    ),
  },
  {
    sp: 'Hvorfor skal jeg søge, før jeg melder noget?',
    sv: (
      <>
        Fordi en fejl med mange stemmer tæller mere end ti næsten-ens dubletter. Findes
        din fejl allerede, så giv den en stemme (&quot;Mig med&quot;) i stedet — så står
        vi stærkere samlet.
      </>
    ),
  },
  {
    sp: 'Hvad er &quot;Fejl 40&quot;?',
    sv: (
      <>
        En kærlig påmindelse om at prøve en <strong>genstart</strong> først — rygtet
        siger, at ca. 40% af alle bugherrer forsvinder efter en tur i reset. Virker det
        bagefter, behøver vi slet ikke melde den. 😉
      </>
    ),
  },
  {
    sp: 'Hvordan melder jeg en fejl?',
    sv: (
      <>
        Tryk <strong>&quot;Meld en bugherre&quot;</strong>, og beskriv <em>hvordan fejlen
        genskabes</em> — trin for trin. Jo mere præcist, jo nemmere kan Zeekr reproducere
        og rette den.
      </>
    ),
  },
  {
    sp: 'Hvad er &quot;byggemødet&quot; (kommentarerne)?',
    sv: (
      <>
        Stedet hvor vi hjælper hinanden. Er det en betjeningsfejl, eller har du et fix?
        Så skriv det — måske er det slet ikke en fejl, men en skjult indstilling.
      </>
    ),
  },
  {
    sp: 'Hvad betyder det grønne &quot;✅ Løsning&quot;-mærke?',
    sv: (
      <>
        At et svar i tråden er markeret som løsningen på fejlen. Det vises øverst, så du
        finder svaret med det samme uden at læse hele tråden. Alle kan markere en løsning;
        er der først sat en, er det kun formanden (admin) der kan ændre den.
      </>
    ),
  },
  {
    sp: 'Kan jeg følge mine egne meldinger?',
    sv: (
      <>
        Ja. Melder du noget, kan du på forsiden slå <strong>&quot;Mine meldinger&quot;</strong>
        til og se dine egne sager — og <strong>🆕 nye svar</strong> lyser op, når nogen har
        svaret, siden du sidst kiggede. (Huskes pr. browser, så din telefon og pc hver for
        sig.)
      </>
    ),
  },
  {
    sp: 'Hvad betyder statusserne?',
    sv: (
      <>
        <strong>Undersøges</strong> → vi kigger på den. <strong>Bekræftet</strong> → flere
        oplever den. <strong>Sendt til Zeekr</strong> → med i en rapport videre til
        producenten. <strong>Løst!</strong> → den er fikset. 🎉
      </>
    ),
  },
];

const SPILLEREGLER: string[] = [
  'Vær venlig og hjælpsom — vi er her for at hjælpe hinanden, ikke for at skælde ud.',
  'Hold dig til emnet: Zeekr 7GT og dens software.',
  'Skriv sagligt og præcist — det er det, Zeekr kan bruge til noget.',
  'Ingen spam, reklame eller personangreb.',
  'Del ikke personlige oplysninger — hverken dine egne eller andres (fx registreringsnummer, adresse, VIN).',
  'Markér gerne en løsning, når en fejl er hjulpet på vej — så hjælper du den næste.',
];

export default function FaqSide() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl border-4 border-asfalt-900 bg-asfalt-900 text-white shadow-lg">
        <div className="h-3 w-full bg-advarselsstriber" aria-hidden />
        <div className="px-6 py-8 sm:px-10 sm:py-9">
          <h1 className="text-2xl font-black leading-tight sm:text-3xl">
            FAQ &amp; spilleregler <span aria-hidden>👷</span>
          </h1>
          <p className="mt-3 max-w-2xl text-asfalt-200">
            Kort om hvordan <strong className="text-white">Bugherrer</strong> virker — og
            hvordan vi opfører os over for hinanden på byggepladsen.
          </p>
        </div>
        <div className="h-3 w-full bg-advarselsstriber" aria-hidden />
      </section>

      {/* Sådan virker det */}
      <h2 className="mt-8 text-xl font-black text-asfalt-900">🛠️ Sådan virker det</h2>
      <div className="mt-4 space-y-3">
        {SAADAN_VIRKER.map((p, i) => (
          <details key={i} className="kort p-5 [&_summary]:cursor-pointer">
            <summary className="font-bold text-asfalt-900 marker:text-hjelm-500">
              {p.sp}
            </summary>
            <p className="mt-2 text-asfalt-700">{p.sv}</p>
          </details>
        ))}
      </div>

      {/* Spilleregler */}
      <h2 className="mt-10 text-xl font-black text-asfalt-900">🤝 God tone på pladsen</h2>
      <div className="kort mt-4 p-6">
        <ul className="space-y-2">
          {SPILLEREGLER.map((r, i) => (
            <li key={i} className="flex gap-2 text-asfalt-700">
              <span aria-hidden>✔️</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Om siden */}
      <h2 className="mt-10 text-xl font-black text-asfalt-900">ℹ️ Om siden</h2>
      <div className="kort mt-4 p-6 text-asfalt-700">
        <p>
          Bugherrer er et <strong>100% uafhængigt, privat initiativ</strong> drevet af og
          for bilentusiaster. Siden er ikke tilknyttet, sponsoreret eller godkendt af ZEEKR
          Denmark ApS, Geely eller deres datterselskaber.
        </p>
        <p className="mt-3">
          Fandt du ikke svar her? Kig forbi{' '}
          <Link href="/links" className="font-bold text-hjelm-700 hover:underline">
            Nyttige links
          </Link>{' '}
          eller{' '}
          <Link href="/opret" className="font-bold text-hjelm-700 hover:underline">
            meld en bugherre
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
