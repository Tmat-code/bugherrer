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
    beskrivelse: 'Zeekrs officielle danske side med priser, rækkevidde og modeldetaljer.',
    linkTekst: 'Zeekr Danmark',
    url: 'https://zeekr.eu',
  },
  {
    ikon: '📱',
    kategori: 'Connected Services',
    beskrivelse: 'Oversigt over bilens app, digitale nøgle (UWB) og infotainmentsystem.',
    linkTekst: 'Zeekr Connected Services',
    url: 'https://zeekr.eu',
  },
  {
    ikon: '🔧',
    kategori: 'Tekniske detaljer',
    beskrivelse:
      'Omfattende og nørdet gennemgang af bilens luftaffjedring, dimensioner og AWD-specifikationer.',
    linkTekst: 'EVKX Specifikationer',
    url: 'https://evkx.net',
  },
  {
    ikon: '📝',
    kategori: 'Anmeldelse & test',
    beskrivelse:
      'Bilbasens store test af bilens europæiske køreegenskaber samt fordele og ulemper.',
    linkTekst: 'Bilbasen Blog – Test',
    url: 'https://bilbasen.dk',
  },
  {
    ikon: '💰',
    kategori: 'Pris & info',
    beskrivelse:
      'Bjarne Nielsens officielle modelside med information om udstyrsniveauer og priser.',
    linkTekst: 'Bjarne Nielsen',
    url: 'https://bjarnenielsen.dk',
  },
  {
    ikon: '🏢',
    kategori: 'Erhverv & leasing',
    beskrivelse: 'Information om flådeløsninger, beskatningsgrundlag og erhvervsleasing.',
    linkTekst: 'Via Biler Fleet',
    url: 'https://viabiler.dk',
  },
  {
    ikon: '💬',
    kategori: 'Fællesskab & erfaringer',
    beskrivelse: 'Dansk Zeekr-gruppe på Facebook til deling af tips, leveringstider og erfaringer.',
    linkTekst: 'Facebook-gruppe',
    url: 'https://facebook.com',
  },
  {
    ikon: '🛒',
    kategori: 'Eftermarkedsudstyr (EU)',
    beskrivelse: 'Webshop med modeltilpasset tilbehør som TPE-måtter, tagbøjler og beskyttelse.',
    linkTekst: 'Evstitan Danmark',
    url: 'https://evstitan.com',
  },
  {
    ikon: '🌍',
    kategori: 'Eftermarkedsudstyr (globalt)',
    beskrivelse:
      'International webshop med et stort udvalg af interiørbeskyttelse og ekstern styling til 7GT.',
    linkTekst: 'NiceEVS Shop',
    url: 'https://niceevs.com',
  },
  {
    ikon: '🚢',
    kategori: 'Fragt- & biltracking',
    beskrivelse:
      'Spor dit køretøj via rederiet Höegh, når skibet sejler bilerne mod havnene i Europa.',
    linkTekst: 'Höegh Cargo Tracking',
    url: 'https://hoeghautoliners.com',
  },
  {
    ikon: '🔎',
    kategori: 'Biler på markedet',
    beskrivelse: 'Oversigt over aktuelle brugte modeller og leveringsklare biler i Danmark.',
    linkTekst: 'Bilbasen Markedsplads',
    url: 'https://bilbasen.dk',
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
