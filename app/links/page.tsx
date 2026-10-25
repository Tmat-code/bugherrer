import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Nyttige links — Bugherrer',
  description:
    'Nyttige links til Zeekr 7GT: officielle sider, specifikationer, test, tilbehør, leasing og fællesskab.',
};

type LinkPunkt = {
  ikon: string;
  kategori: string;
  beskrivelse: string;
  linkTekst: string;
  url: string;
};

const LINKS: LinkPunkt[] = [
  {
    ikon: '🚗',
    kategori: 'Officiel modelside',
    beskrivelse: 'Zeekrs officielle europæiske 7GT-side med rækkevidde og modeldetaljer.',
    linkTekst: 'Zeekr 7GT (zeekr.eu)',
    url: 'https://www.zeekr.eu/models/7gt',
  },
  {
    ikon: '📱',
    kategori: 'Connected Services',
    beskrivelse:
      'Bilens app, digitale nøgle (UWB) og infotainment — beskrevet på den officielle 7GT-side.',
    linkTekst: 'Zeekr 7GT – Connected',
    url: 'https://www.zeekr.eu/models/7gt',
  },
  {
    ikon: '🔧',
    kategori: 'Tekniske detaljer',
    beskrivelse:
      'Nørdet, dansk gennemgang af luftaffjedring, dimensioner og AWD-specifikationer.',
    linkTekst: 'EVKX – 7GT specifikationer',
    url: 'https://evkx.net/da/models/zeekr/7gt/7gt_privilege_awd/specifications/',
  },
  {
    ikon: '📝',
    kategori: 'Anmeldelse & test',
    beskrivelse: 'Bilbasens test af 7GT — køreegenskaber samt fordele og ulemper.',
    linkTekst: 'Bilbasen – Test',
    url: 'https://blog.bilbasen.dk/test-zeekr-7gt-kan-noget-kinesiske-elbiler-sjaeldent-mestrer',
  },
  {
    ikon: '💰',
    kategori: 'Pris & info',
    beskrivelse: 'Via Bilers danske modelside for 7GT med udstyrsniveauer og priser.',
    linkTekst: 'Via Biler – 7GT',
    url: 'https://www.viabiler.dk/zeekr/nye-biler/7gt/',
  },
  {
    ikon: '🏢',
    kategori: 'Erhverv & leasing',
    beskrivelse: 'Via Bilers fleet-side for 7GT — flådeløsninger, beskatning og erhvervsleasing.',
    linkTekst: 'Via Biler – Fleet',
    url: 'https://www.viabiler.dk/fleet-info/zeekr-fleet/zeekr-7gt/',
  },
  {
    ikon: '💬',
    kategori: 'Fællesskab & erfaringer',
    beskrivelse: 'Dansk Zeekr-gruppe på Facebook til deling af tips, leveringstider og erfaringer.',
    linkTekst: 'Facebook-gruppe',
    url: 'https://www.facebook.com/share/g/1DVmwAa8hR/?mibextid=wwXIfr',
  },
  {
    ikon: '🛒',
    kategori: 'Eftermarkedsudstyr (EU)',
    beskrivelse: 'Webshop med modeltilpasset 7GT-tilbehør som TPE-måtter, tagbøjler og beskyttelse.',
    linkTekst: 'Evstitan – 7GT tilbehør',
    url: 'https://www.evstitan.com/collections/zeekr-7-gt-accessories',
  },
  {
    ikon: '🌍',
    kategori: 'Eftermarkedsudstyr (globalt)',
    beskrivelse:
      'International webshop med stort udvalg af interiørbeskyttelse og styling til 7GT.',
    linkTekst: 'NiceEVS – 7GT tilbehør',
    url: 'https://niceevs.com/collections/zeekr-7gt-accessories',
  },
  {
    ikon: '🛞',
    kategori: 'Fælge & dæk',
    beskrivelse:
      'Alufælge, stålfælge og sommer-/vinterdæk til bl.a. Zeekr — med montering og afbalancering.',
    linkTekst: 'Keratech Wheels',
    url: 'https://keratech.dk/',
  },
  {
    ikon: '🚢',
    kategori: 'Fragt- & biltracking',
    beskrivelse:
      'Spor dit køretøj hos rederiet Höegh (booking, B/L eller VIN), mens bilen sejler mod Europa.',
    linkTekst: 'Höegh – My Cargo',
    url: 'https://www.hoeghautoliners.com/my-cargo',
  },
  {
    ikon: '🔎',
    kategori: 'Biler på markedet',
    beskrivelse: 'Oversigt over 7GT til salg og leveringsklare biler i Danmark.',
    linkTekst: 'Bilbasen – 7GT',
    url: 'https://www.bilbasen.dk/brugt/bil/zeekr/7gt',
  },
];

export default function LinksSide() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl border-4 border-asfalt-900 bg-asfalt-900 text-white shadow-lg">
        <div className="h-3 w-full bg-advarselsstriber" aria-hidden />
        <div className="px-6 py-8 sm:px-10 sm:py-9">
          <h1 className="text-2xl font-black leading-tight sm:text-3xl">
            Nyttige links <span aria-hidden>🔗</span>
          </h1>
          <p className="mt-3 max-w-2xl text-asfalt-200">
            En samling af nyttige sider til <strong className="text-white">Zeekr 7GT</strong> —
            officielle modelsider, nørdede specifikationer, test, tilbehør, leasing og
            fællesskab. Mangler der et godt link? <Link href="/opret" className="text-hjelm-300 underline hover:text-hjelm-200">Meld det som en bugherre</Link> eller skriv i gruppen.
          </p>
        </div>
        <div className="h-3 w-full bg-advarselsstriber" aria-hidden />
      </section>

      {/* Link-kort */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <a
            key={l.kategori}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="kort group flex flex-col gap-2 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>{l.ikon}</span>
                <h2 className="font-bold text-asfalt-900 group-hover:text-hjelm-700">
                  {l.kategori}
                </h2>
              </div>
              <span className="shrink-0 text-asfalt-400 group-hover:text-hjelm-600" aria-hidden>
                ↗
              </span>
            </div>
            <p className="text-sm leading-relaxed text-asfalt-600">{l.beskrivelse}</p>
            <span className="mt-auto pt-1 text-sm font-bold text-hjelm-700">{l.linkTekst}</span>
          </a>
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-asfalt-500">
        <span aria-hidden>⚠️</span> Linkene fører til eksterne sider, som Bugherrer ikke har
        kontrol over eller ansvar for. De er samlet som en hjælp til fællesskabet.
      </p>
    </div>
  );
}
