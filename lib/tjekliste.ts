// Tjekliste til afhentning af bilen. Ét fælles sted, så både siden (/tjekliste)
// og PDF'en (/api/tjekliste) bruger præcis samme indhold.

export const TJEKLISTE_TITEL = 'Tjekliste til afhentning';
export const TJEKLISTE_INTRO =
  'Tag listen med, når du henter din Zeekr 7GT — og få styr på det hele, inden du kører derfra.';

export interface TjeklisteSektion {
  titel: string;
  punkter: string[];
}

export const TJEKLISTE: TjeklisteSektion[] = [
  {
    titel: 'Bilens stand',
    punkter: [
      'Kontrollér lak, fælge, ruder og interiør for skader.',
      'Kontrollér at alt bestilt udstyr og tilbehør er leveret.',
      'Kontrollér at alle nøgler og ladekabler er med.',
    ],
  },
  {
    titel: 'Software og kalibrering',
    punkter: [
      'Bekræft at nyeste tilgængelige software er installeret.',
      'Få bekræftet at kameraer, radar, parkeringssensorer og ADAS-systemer er korrekt kalibreret, og at der ikke er aktive fejl.',
      'Kontrollér at matrix-lygter er korrekt indstillet og fungerer.',
      'Få kontrolleret hjulindstilling/sporing ved tegn på skævhed eller ujævnt dækslid.',
      'Opsæt Zeekr-app, førerprofil og eventuel digital nøgle.',
    ],
  },
  {
    titel: 'Batteri og opladning',
    punkter: [
      'Få demonstreret batteriforvarmning før lynladning.',
      'Få forklaret anbefalet ladegrænse og batteripleje.',
      'Kontrollér batteriprocent ved levering, og få demonstreret ladestikket.',
    ],
  },
  {
    titel: 'Funktioner og dokumentation',
    punkter: [
      'Test kameraer, parkeringssensorer og førerassistenter.',
      'Få demonstreret klimastyring, sædefunktioner og forvarmning.',
      'Få gennemgået garanti, service og vejhjælp.',
      'Få eventuelle fejl og mangler dokumenteret skriftligt inden aflevering.',
    ],
  },
];
