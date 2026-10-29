# HANDOVER — Bugherre

Løbende status-log. Opdateres ved hver ændring.

---

## 2026-10-29 — Fix: statistik-siden kastede 500 (dobbelt-Z i dato)

`/admin/statistik` gav server-fejl (RangeError: Invalid time value). Årsag: "sidste 30
dage"-løkken sendte en ISO-streng (allerede med T og Z) ind i `dkDele`, som tilføjede
endnu et `Z` → ugyldig dato → `Intl.formatToParts` kastede. `dkDele` håndterer nu begge
tidsformater og returnerer null ved ugyldig dato (én dårlig række vælter ikke siden).
Genskabt lokalt på standalone-server (login-cookie forged) → nu HTTP 200.

---

## 2026-10-29 — Admin-statistikside + bil-bekræft justeret

**Statistik:** ny side `/admin/statistik` (📈 Aktivitet-link i admin-headeren). Viser
fællesskabs-aktivitet (stemmer + svar + nye bugherrer) de sidste 90 dage, i **dansk tid**:
nøgletal, søjlediagram pr. klokkeslæt (0–23), pr. ugedag, og pr. dag (sidste 30). Et
lille "travlest/roligst"-tip peger på det tryggeste deploy-vindue. Rene CSS-søjler
(ingen chart-lib). Ny query `aktivitetSiden` (UNION af de tre tidsstempel-kilder);
bucketing til Europe/Copenhagen sker i siden via Intl. NB: dette er *aktivitet*, ikke
server-CPU — ægte server-belastning ses i Coolifys egen overvågning.

**Bil-bekræft justeret:** fjernet "Spring over"-knappen OG "Anden / ved ikke"-valget —
nu kun de tre rigtige varianter (Privilege AWD / Long Range RWD / Core RWD). En ægte
ejer kender sin variant → renere data. Boksen er stadig ikke-blokerende (ikke-ejere
ignorerer den bare).

---

## 2026-10-29 — Bil-bekræftelse (let ejerskabs-signal, intet VIN)

Troværdighed til Zeekr: efter at have stemt kan brugeren med ét tryk vælge sin
**7GT-variant** (Zeekrs egne navne) og dermed bekræfte ejerskab. Bevidst VIN-frit
(Torben vil ikke ligge inde med VIN) og lav friktion.

- **Varianter** (`lib/config.ts` `ZEEKR_VARIANTER`): Privilege AWD, Long Range RWD,
  Core RWD, Anden (escape).
- **DB:** `stemmer_log.ejer_variant TEXT` (idempotent ALTER — følger automatisk med på
  prod-volumen ved opstart). "Bil-bekræftet" = ejer_variant er sat. Gemmer KUN varianten,
  intet VIN/personhenførbart.
- **Flow:** stem (uændret) → lille boks "Ejer du en 7GT? Vælg variant" (kan springes
  over). `/api/bekraeft-ejer` sætter varianten på den aktuelle browsers stemme
  (vote-token); kræver at man har stemt (ellers 409).
- **Visning:** "🚗 N bil-bekræftet" på kort (FejlListe) + detaljeside.
- **Eksport:** CSV får kolonnerne **Bil-bekræftede** + **Varianter (bil-bekræftet)**;
  PDF-metalinjen viser fx "Bil-bekræftet: 8 (4× Long Range RWD, 3× Privilege AWD)".
  Så kan Zeekr se "N bekræftede ejere" + fordeling pr. variant.
- Queries: `bekraeftEjer`, `antalEjerBekraeftet`, `ejerVarianter`; `antal_ejer_bekraeftet`
  tilføjet `alleFejlMedSvar` (FejlMedSvar).

Verificeret end-to-end (stem → bekræft → tæl; ukendt variant afvist; 409 uden stemme).
Build grøn (25 sider). Næste rung hvis gaming bliver et problem: e-mail-bekræftelse
(stadig uden VIN) — ikke bygget.

---

## 2026-10-29 — SEO-pakke (OG/social, per-side metadata, sitemap, robots)

Delt på Facebook → nu gjort delevenligt og indekserbart:

- **OpenGraph + Twitter cards** (layout.tsx): `metadataBase = https://{SITE_DOMAIN}`,
  titel-template `%s – Bugherrer`, OG/Twitter-defaults + delebillede. Delinger på FB/X
  viser nu titel, beskrivelse og billede i stedet for en nøgen URL.
- **OG-delebillede** `public/og.png` (1200×630, byggeplads-tema, renderet med Chromium).
- **Per-side metadata** på `/fejl/[id]` via `generateMetadata`: hver bug får egen titel,
  beskrivelse (uddrag af beskrivelsen), canonical og OG — godt for både Google og deling
  af en konkret fejl.
- **Dynamisk sitemap** `app/sitemap.ts`: forside + statiske sider + alle fejl-sider.
- **Dynamisk robots** `app/robots.ts` (erstatter `public/robots.txt`): Allow alt, Disallow
  /admin, Sitemap- + Host-linje. Følger SITE_DOMAIN.
- Undersiders titler (faq/kontakt/links) rettet til bare navn (template tilføjer suffiks).

Verificeret end-to-end (standalone server): robots.txt, sitemap.xml og OG-tags renderer
korrekt med absolut billede-URL. Build grøn (24 sider).

**Torben bør gøre manuelt (engangs):**
1. **Facebook:** kør URL'en gennem Sharing Debugger (developers.facebook.com/tools/debug)
   og tryk "Scrape Again", så FB henter de nye OG-tags (den cacher den gamle nøgne version).
2. **Google Search Console:** tilføj bugherrer.dk (hvis ikke gjort) og indsend
   `https://bugherrer.dk/sitemap.xml`. (Du har allerede GSC på karvia.dk, så flowet er kendt.)

---

## 2026-10-27 — Links: brugermanual tilføjet

Tilføjet link på `/links` til Zeekrs officielle danske 7GT-brugermanual
(2026, Long Range RWD). URL renset for fbclid-tracking; manual-vælgende parametre
(vk/yk/lk/vn/yn/ven) bevaret.

---

## 2026-10-26 — Links: vinduesviskere tilføjet

Tilføjet link på `/links` (app/links/page.tsx): Bosch Aerotwin A620S-viskerblade hos
viskerbladet.dk, med beskrivelse om bedre viskere end de originale. URL renset for
tracking-parametre (gclid/gad_* fjernet).

---

## 2026-10-25 — Løst-tråde: notits i stedet for lås

Tråde på "Løst!"-fejl holdes bevidst **åbne** (en løst fejl kan vende tilbage efter en
OTA-opdatering — det signal vil vi fange, ikke blokere, så folk ikke opretter dubletter).
I stedet vises en grøn notits over kommentarfeltet: *"Denne bugherre er markeret som løst.
Er fejlen vendt tilbage …? Så skriv endelig herunder, så kigger vi på at genåbne den."*
Gør kommentarer på løste til regressions-meldinger frem for støj.

`Kommentarspor.tsx` fik ny prop `erLoest`; `app/fejl/[id]/page.tsx` sender
`erLoest={fejl.status === 'Løst!'}`. (Valgt A; en egentlig admin-"lås tråd" (B) kan
tilføjes senere hvis spam/rod bliver et problem.)

---

## 2026-10-25 — "Under opbygning"-banner

Tynd gul stribe (🚧) lige under headeren: "Sitet er stadig under opbygning —
kortvarige nedetider kan forekomme. Tak for tålmodigheden!" Besøgende kan lukke den
(huskes pr. browser, localStorage-nøgle `bugherrer_underopbygning_skjult_v1`).

Env-styret: **tændt som standard**, slås fra med `UNDER_OPBYGNING=0` i Coolify (læses
server-side i `layout.tsx` — ingen rebuild/kodeændring nødvendig for at toggle).
Ny fil: `components/UnderOpbygning.tsx`. Dokumenteret i `.env.example`.

---

## 2026-10-25 — Telefon-felter, admin-rediger & eskalerende eksport

Tre nye ting (DB-migrationer er idempotente `ALTER TABLE` — kører automatisk ved opstart):

**1) Telefon + telefon-OS (valgfrit).** Som Zeekrs egen app spørger vi nu (frivilligt)
om telefonmodel + OS — relevant for software-/forbindelsesfejl (CarPlay/Android Auto,
app, Bluetooth). Nye kolonner `telefon`, `telefon_os` på `fejl`. Felter i opret-flow
(`OpretFlow.tsx`, i en "valgfrit"-boks), gemmes via `/api/fejl`, vises på detaljesiden
og i admin-tabellen + rapporterne.

**2) Rediger fejl i admin.** Ny ✏️ Rediger-knap → modal, der retter titel, version,
beskrivelse og telefon-felter. Nyt endpoint `/api/admin/rediger` (login-gated).
Bruges til at rette åbenlyse slåfejl i meldinger (fx `3.0.03` → `3.0.3`). Oversættelses-
cachen ugyldiggøres automatisk (hashet på titel+beskrivelse).

**3) Eksport der ikke gentager sig selv.** To nye kolonner `sidst_sendt_stemmer` +
`sidst_sendt_dato`. Flueben **"Kun nye + eskalerende"** i eksport-panelet: tager kun
fejl med, der aldrig er sendt, eller som har fået flere stemmer siden sidst. Rapport
(PDF + CSV) viser **NY** eller **+N siden sidst**, så Zeekr ser hvad der eskalerer —
en fejl der er vokset fra 8→58 stemmer kommer med igen, en uændret droppes.
Knap **"Markér top X som sendt"** (`/api/admin/marker-sendt`) gemmer nuværende
stemmetal som nulpunkt, så delta regnes derfra næste gang.

**Bevidst fravalgt:** flueben om "allerede meldt i Zeekr-appen" (lav værdi, ekstra
friktion — boardet kører netop udenom Zeekrs egen løsning). Kan tilføjes senere.

**Nye/ændrede filer:** `lib/db.ts` (kolonner + queries `opdaterFejl`, `markerSendt`,
`topFejlKunAendrede`), `lib/rapport-i18n.ts` (telefon-label + delta + CSV-kolonner +
`deltaTekst()`), `app/api/fejl/route.ts`, `app/api/admin/rediger/route.ts` (ny),
`app/api/admin/marker-sendt/route.ts` (ny), `app/api/admin/export/route.ts` +
`export/csv/route.ts`, `components/OpretFlow.tsx`, `components/AdminDashboard.tsx`
(rediger-modal + eksport-panel), `app/fejl/[id]/page.tsx`. Build grøn.

---

## 2026-10-25 — Fjernet fiktivt demo-indhold

De 8 seedede eksempel-bugherrer var opdigtede (fiktive softwareversioner, pumpede
stemmetal, fake kommentar-navne som "LadeLars"). For at boardet er troværdigt —
dets værdi er at sende *ægte* fællesskabs-bekræftede fejl til Zeekr — er al demo-data
fjernet fra `scripts/seed.mjs`. Scriptet opretter nu kun skemaet; ingen rækker.
(Entrypoint seeder alligevel kun på en frisk volume — eksisterende data røres ikke.)

**Plan for ægte dag-ét-indhold:** Torben kopierer en håndfuld af sine *egne* bygherrer
fra Zeekr-appen (ægte fejl, rigtige versioner). Ingen web-kilde duer (7GT for ny +
SEO-spam). Fiktive stemmer/kommentarer undgås bevidst.

**Handling på prod:** de 8 nuværende demo-opslag slettes manuelt via admin (🗑️ Slet)
— de kommer ikke tilbage ved genstart (DB-filen findes).

---

## 2026-10-25 — Mail-notifikation LIVE ✅ (n8n → mail om ulæste henvendelser)

Hele kæden kører: kontaktformular → ulæst henvendelse → n8n dagligt tjek → mail.
Testet end-to-end (mail modtaget i Outlook).

- **Coolify:** `NOTIFIKATION_TOKEN` sat på bugherrer (gater endpointet).
- **n8n-workflow "Bugherrer notifikation":** Schedule (dagligt kl. 8) → HTTP GET
  `https://bugherrer.dk/api/admin/notifikation?token=...` → IF `uuseteHenvendelser > 0`
  → Send Email (SMTP via Gmail: `smtp.gmail.com:587`, app-password, afsender
  pestell.mathiasen@gmail.com → modtager t.mathiasen@outlook.com). Publiseret/aktivt.
- Stopper af sig selv når Torben åbner /admin (nulstiller `admin_sidst_set`).
- Note: første mail landede i Outlook-spam (ny Gmail-afsender) — markér "ikke
  uønsket" + tilføj afsender som sikker, så fremtidige rammer indbakken.

**🎉 Hele backlog-listen fra 25/10 er nu i hus:** løsnings-markering, foldede tråde,
"vis flere", admin-overblik, kontaktformular + indbakke, FAQ, nye links,
LibreTranslate (da/en/sv), og mail-notifikation.

---

## 2026-10-25 — LibreTranslate LIVE ✅ (rapporter på EN/SV virker)

LibreTranslate kører nu på Pixa via Coolify, og bugherrer oversætter fejl-teksten
i rapporterne. Verificeret: engelsk PDF kom ud med oversat titel + beskrivelse +
status. 🎉

**Opsætning i Coolify:**
- Ny ressource (Docker image): `libretranslate/libretranslate:latest`, port
  **5000**, network alias **`libretranslate`**, env `LT_LOAD_ONLY=en,da,sv`.
  (Hentede kun 4 modeller: da↔en, en↔sv, sv→en. Dansk→svensk sker via engelsk-pivot.)
- bugherrer: env `LIBRETRANSLATE_URL=http://libretranslate:5000` (intern, ingen åbne
  porte). Redeploy for at aktivere.
- Forbindelsen er intern på "coolify"-Docker-netværket via alias'et — intet eksponeret.
  (LibreTranslates sslip.io-domæne er alligevel ikke nået udefra, da 80/443 ikke er
  port-forwardet; kan fjernes for ryddelighed.)

**Kvalitet:** god, maskin-niveau; enkelte bogstavelige knaster (fx "lynladere" →
"lightning chargers"). Fint til formålet.

**Tilbage:** mail-notifikation om ulæste henvendelser (n8n + NOTIFIKATION_TOKEN).

---

## 2026-10-25 — Kontaktformular → admin-indbakke + notifikations-endpoint

Folk kan nu skrive til formanden; det lander i admin (ingen offentlig mailadresse).

- **`/kontakt`-side** med formular (navn + e-mail valgfri, besked påkrævet), samme
  spam-værn som de andre (honeypot + rate-limit 5/time + Turnstile). Gemmes i ny
  `henvendelser`-tabel. Link i footeren.
- **Admin:** ny **"📨 Henvendelser"**-sektion (nyeste 20) med NY-markering + mailto
  + "Svar på mail". Nøgletal viser **nye henvendelser** og **ny aktivitet siden sidst**.
  "Ulæst" = henvendelser efter `admin_sidst_set` (nulstilles når admin åbner /admin).
- **Notifikations-endpoint** `GET /api/admin/notifikation?token=XXX` (beskyttet af
  `NOTIFIKATION_TOKEN`): returnerer `uuseteHenvendelser`, `nyeFejl`, `nyeKommentarer`,
  `dageSidenAdmin`, `boerNotificere`. Opdaterer IKKE sidst-set. Afventer n8n-workflow.

**MANGLER (n8n, ved skærm):** dagligt schedule → kald notifikations-endpointet →
hvis `boerNotificere` → send Torben en mail. Kræver mail-credentials i n8n (SMTP/
Outlook/tjeneste). Stopper af sig selv når han åbner /admin. Sæt `NOTIFIKATION_TOKEN`
i Coolify først.

**Fix:** FAQ-spørgsmål viste rå `&quot;` — rettet til rigtige anførselstegn.

---

## 2026-10-25 — FAQ & spilleregler-side (/faq)

Ny statisk side `app/faq/page.tsx` med to dele: **"Sådan virker det"** (hvad er
Bugherrer, søg-først, fejl 40, meld, byggemøde, løsnings-mærke, mine meldinger,
statusser — som udklappelige `<details>`) og **"God tone på pladsen"** (spilleregler:
vær venlig, hold dig til emnet, ingen spam/personangreb, del ikke persondata).
Plus "Om siden" (disclaimer + links). Lagt i footeren sammen med "Nyttige links"
og login. Teksten er et udkast Torben kan finpudse.

**Udestående (kontakt):** afventer Torbens valg — kontaktformular der lander i admin
(anbefalet, beskytter mailen) vs. synlig mailadresse; og om der skal mail-notifikation
(evt. via n8n). Byg når besluttet.

---

## 2026-10-25 — Oversætter skiftet til LibreTranslate (kode klar, afventer container)

DeepL droppet (gratis-tier nulstilles ikke + kort-krav). Oversætter-koden peger nu
på en **selvhostet LibreTranslate** — gratis, ingen konto, teksten forlader ikke
serveren. Cache + i18n + graceful uændret.

- `lib/oversaet.ts`: kalder `POST {LIBRETRANSLATE_URL}/translate` (JSON, q som array,
  source=da). Env: `LIBRETRANSLATE_URL` (aktiverer), `LIBRETRANSLATE_API_KEY` (valgfri).
  Graceful: ingen URL → dansk fallback (= nuværende opførsel). 20s timeout.
- `rapport-i18n.ts`: `DEEPL_MAALSPROG` → `MAALSPROG` (ISO-koder da/en/sv).
- `.env.example` + admin-hint opdateret til LibreTranslate.

**MANGLER (Coolify-session, kan gøres fra telefon på hjemme-WiFi — ikke kun Mac):**
1. Deploy LibreTranslate i Coolify: Docker image `libretranslate/libretranslate`,
   port **5000**. Env `LT_LOAD_ONLY=en,da,sv` (holder den let). Evt. persistent
   volume til sprog-modeller, så de ikke hentes igen ved genstart. Evt. `LT_API_KEYS`
   hvis man vil kræve nøgle.
2. På bugherrer-appen: sæt `LIBRETRANSLATE_URL` (fx `http://192.168.1.18:5000` eller
   den interne Docker-adresse) → redeploy.
3. Test en EN- og SV-PDF med rigtig oversat fejl-tekst.

---

## 2026-10-25 — Fold lange tråde + "Vis flere" på forsiden

- **Lange kommentar-tråde foldes sammen:** er der mere end 4 svar (ud over en evt.
  pinnet løsning), vises de **nyeste 3** + en **"Vis alle X svar"**-knap. "Vis
  færre" folder sammen igen. Løsningen er altid synlig øverst. (`Kommentarspor`,
  `visAlle`-state.)
- **Forsiden viser 25 kort ad gangen** med en **"Vis flere"**-knap (+25). Ved
  søgning eller "Mine meldinger" vises alt (så fuzzy-søgning stadig dækker alt).
  (`FejlListe`, `antalVist`-state.) Ægte sidenummerering gemt til boardet er stort.

**Tilbage:** ④ LibreTranslate på Pixa (afløser DeepL).

---

## 2026-10-25 — "Markér som løsning" (pin et svar som fixet)

Løfter selve svaret frem, så man ikke skal læse 30 kommentarer for at finde fixet.

- Et svar kan markeres som **✅ Løsning** — det pinnes øverst i tråden (grøn boks),
  og **forsidekortet får et "✅ Løsning"-mærke**, så man straks ser hvilke fejl
  der har et community-fix.
- **Rettigheder (bevidst):** *alle* kan markere en løsning når der ikke er en i
  forvejen (hjælper den eneste admin med at moderere). Er der allerede en løsning,
  kan **kun admin** ændre eller fjerne den — melder/andre kan ikke. Server-håndhævet
  i `/api/loesning` (admin = `erLoggetInd()`), ikke kun i UI.
- Rate-limit 30/time pr. IP på endpointet.

**Teknik:**
- Ny kolonne `fejl.loesning_kommentar_id` (tilføjes via idempotent `ALTER TABLE`
  i `migrate()` — try/catch, så eksisterende prod-DB opdateres uden fejl).
- `/api/loesning` (POST: kommentarId=tal → sæt, null → fjern/admin).
- `Kommentarspor` får `loesningId` + `erAdmin` fra detaljesiden; viser pinnet
  løsning + "Markér/Fjern"-knapper. `FejlListe` viser mærket via
  `loesning_kommentar_id`.

**Næste på listen (aftalt):** ② fold lange tråde sammen ("Vis alle X svar"),
③ "Vis flere" på forsiden, ④ LibreTranslate på Pixa (afløser DeepL — gratis,
selvhostet; DeepL-fri-tier nulstilles ikke, så den droppes).

---

## 2026-10-24 — Admin-overblik (server-side, uafhængigt af browser)

Ejeren får nu et rigtigt overblik over hvad der kommer ind — pålideligt på tværs
af enheder (modsat localStorage-sporet, der kun er pr. browser for besøgende).

Øverst på `/admin`:
- **Nøgletal:** bugherrer i alt, svar i alt, nye bugherrer + nye svar *siden du
  sidst var inde* (fremhævet hvis > 0).
- **Aktivitetsfeed:** seneste ~20 hændelser (nye fejl + nye svar) i tidsrækkefølge,
  med link til fejlen og relativ tid. Nye hændelser siden sidst markeres med "NY".

**Teknik:**
- Ny `meta`-tabel (key/value). `admin_sidst_set` gemmer admins sidste besøgstid
  server-side; opdateres hver gang admin åbner siden (efter data er hentet, så
  "nyt" regnes mod *forrige* besøg). Første besøg = baseline = nu (intet står
  falsk-nyt; `oprettet > NULL` giver 0).
- Nye queries i `lib/db.ts`: meta get/set, antal/nye-tællere, `senesteFejl`,
  `senesteKommentarer`. Indeks på `kommentarer(oprettet)`.
- Typer `Overblik` + `AktivitetItem` eksporteres fra `AdminDashboard`.

---

## 2026-10-24 — "Mine meldinger" (følg dine egne meldte fejl)

Gør det nemt for en melder at følge sine egne fejl og se når nogen har svaret.

- Når man opretter en fejl, husker **browseren** fejlens ID
  (`bugherrer_mine_meldinger_v1` i localStorage, sat i `OpretFlow` på succes).
- På forsiden dukker en **"🙋 Mine meldinger (N)"**-knap op (kun hvis denne browser
  har oprettet noget) — slå til for kun at se egne meldinger, med 🆕-mærket på dem
  der har fået svar.
- Egen tom-tilstand hvis man endnu ikke har meldt noget.
- Pr. browser/enhed, ingen konti (samme præmis som "nyt svar"). Hjælpere i
  `lib/svar-set.ts`: `hentMine()` / `tilfoejMin()`.

---

## 2026-10-24 — "Nyt svar"-markering + svar-tal + aktivitets-sortering

Gør det synligt på forsiden hvor der er diskussion — vigtigt for fejl-40-casene,
hvor det er *svarene* (en anden bruger hjælper) der er guldet, ikke stemmerne.

- **Fejl-kortene** viser nu **💬 antal svar**, og en fremhævet **🆕 N nye svar**
  når der er kommet svar siden brugeren sidst åbnede fejlen.
- **Ny sortering "Aktivitet"** — tråde med friske svar flyder op.
- **"Set"-styring uden login:** `lib/svar-set.ts` gemmer pr. browser i localStorage
  hvor mange svar brugeren har set pr. fejl (`bugherrer_sete_svar_v1`).
  `Kommentarspor` markerer svar som set når fejlen åbnes. Begrænsning: pr.
  browser/enhed, ikke på tværs (ingen konti). Første besøg sætter baseline, så
  intet fejlagtigt lyser som "nyt".
- **Server:** ny query `alleFejlMedSvar` (fejl + `antal_kommentarer` +
  `sidste_aktivitet` = seneste af oprettet/nyeste kommentar). Forsiden bruger den.
  `soeg()` er gjort generisk, så søgning bevarer de ekstra felter.
- Ingen database-ændring (kommentarer fandtes i forvejen) — kun visning + query.

---

## 2026-10-24 — Rapporter på flere sprog (DA/EN/SV) via DeepL

Admin-eksporten (PDF + CSV) kan nu laves på **dansk, engelsk og svensk**. Vælg
sprog i admin → eksport-panelet, så følger `&sprog=da|en|sv` med i download-linket.

**Arkitektur (graceful, samme filosofi som Turnstile):**
- `lib/rapport-i18n.ts` — rapportens egen tekst (overskrifter, intro, labels,
  status, disclaimer, datoformat, CSV-kolonner) på da/en/sv. Skrevet i hånden,
  ingen tjeneste nødvendig.
- `lib/oversaet.ts` — oversætter selve fejl-teksten (titel + beskrivelse) via
  **DeepL**, med cache i DB-tabellen `oversaettelser` (PK fejl_id+sprog,
  `kilde_hash` invalideres automatisk hvis fejlen redigeres). Ét samlet DeepL-kald
  pr. eksport for alt der mangler i cachen. 15s timeout.
- **Graceful:** uden `DEEPL_API_KEY` (eller ved DeepL-fejl) står rammen på det
  valgte sprog, men fejl-teksten forbliver dansk — intet brækker.
- `DEEPL_API_KEY` sættes som env i Coolify (valgfri). DeepL Free som standard;
  Pro kan overstyres med `DEEPL_API_URL`.

**Norsk** er bevidst udeladt af rapporterne (kun DA/EN/SV). Hele *sitet* på alle
sprog er en senere, større i18n-etape — samme oversætter-motor kan genbruges.

**TODO når nøglen er sat:** verificér en EN- og SV-PDF med rigtig oversat
fejl-tekst; overvej at stramme DeepL-forbrug hvis mange sprog/eksporter.

---

## 2026-10-24 — Ny side: Nyttige links (/links)

Ny statisk side `app/links/page.tsx` med en kurateret liste af nyttige Zeekr 7GT-links
(officielle sider, specs, test, tilbehør, leasing, fællesskab, tracking). Vist som
kort i et 2-kolonne gitter i samme byggeplads-tema. Menupunkt "Links" tilføjet i
`components/Header.tsx`. Alle links åbner i ny fane med `rel="noopener noreferrer"` +
kort disclaimer om eksterne sider.

**Links opdateret til rigtige dyb-links** (researchet): officiel 7GT-side
(zeekr.eu/models/7gt), EVKX DA-specs, Bilbasen-test, Via Biler 7GT (pris) + fleet,
Evstitan/NiceEVS 7GT-collections, Höegh my-cargo, Bilbasen 7GT-liste, FB-gruppen.
To skøn værd at kende:
- **Bjarne Nielsen** droppet som kilde — bjarnenielsen.dk er en "under
  construction"-placeholder. "Pris & info" peger nu på Via Bilers 7GT-modelside i
  stedet.
- **Connected Services** har ingen selvstændig side hos Zeekr; peger pt. på samme
  7GT-modelside som "Officiel modelside" (overvej at droppe eller finde bedre mål).

---

## 2026-10-24 — Pixa IP låst fast (DHCP-reservation)

`192.168.1.18` er nu reserveret på routeren (TDC/Sagemcom), så Pixa altid får
samme IP — også efter strømsvigt eller router-genstart. Vigtigt, fordi n8n,
Cloudflare-tunnelen og Coolify alle peger på `.18`.

- **Router:** TDC Sagemcom → LAN/DHCP → **Reserved Address**.
- **Reserveret nu (WiFi):** MAC `44:90:BA:D5:E6:2B` → `192.168.1.18`, Enable ON.

**NÅR PIXA FLYTTES TIL ETHERNET (kabel) — huskeseddel:**
Ethernet er et nyt netkort med en NY MAC, så reservationen skal opdateres —
lav IKKE en ny række (routeren afviser to reservationer til samme IP).
1. Sæt kablet i Pixa.
2. Find Ethernet-MAC'en: routerens enhedsliste (ubuntu dukker op med ny MAC),
   eller på Pixa: `ip link` (kablet hedder typisk `enp...`/`eth0`).
3. På routerens Reserved Address: i den eksisterende række, skift MAC fra
   `44:90:BA:D5:E6:2B` til den nye Ethernet-MAC. Behold IPv4 `192.168.1.18`. Apply.
4. Slå WiFi fra på Pixa (kun ét aktivt netkort — undgå to IP'er samtidig).
5. Genstart Pixa / forny lease, og bekræft den kommer op på `.18` via kabel.

---

## 2026-10-24 — Fuld auto-deploy via n8n-poller 🤖

Nu kører hele kæden selv: **Claude pusher → n8n opdager det → Coolify deployer.**
Ingen manuelle klik længere.

**Hvorfor n8n og ikke en GitHub-webhook:** GitHub kan ikke nå Coolify udefra
(Pixa har ingen åbne porte — alt går gennem Cloudflare-tunnelen). Så i stedet
"ringer n8n ud" indefra: den sidder på Pixa og spørger GitHub hvert 3. minut, om
der er en ny commit, og kalder så Coolifys deploy-API lokalt. Ingen ny eksponering.

**n8n-workflow "Bugherrer auto-deploy" (4 noder):**
1. Schedule Trigger — hvert 3. minut.
2. HTTP Request (GET) → `https://api.github.com/repos/Tmat-code/bugherrer/commits/main`,
   header `User-Agent: n8n`. Henter seneste commits `sha`.
3. Code — husker sidste `sha` i workflow static data; lukker kun videre hvis ny.
4. HTTP Request (**POST**) → `http://192.168.1.18:8000/api/v1/deploy?uuid=pxyx2cwchfcukslle76fzv4n&force=false`,
   Header Auth-credential `Authorization: Bearer <Coolify API-token>`.

**Coolify-opsætning:** API access slået til (Settings → API and MCP). API-token
`n8n-deploy` med Deploy-rettighed. App-uuid: `pxyx2cwchfcukslle76fzv4n`.

**Sikkerhed:** Allowed IPs i Coolify strammet til private ranges
(`192.168.0.0/16, 172.16.0.0/12, 10.0.0.0/8`) — offentligt internet afvises,
n8n (intern) slipper igennem. Coolify API-token udløb sat til "Never".
Evt. senere: snævre Allowed IPs helt ind til n8n's præcise kilde-IP.

Denne HANDOVER-opdatering er selve test-pushet der skal trigge auto-deploy.

---

## 2026-10-24 — Direkte push fra Claude sat op

Claude-GitHub-app'en har nu skrive-adgang til repoen, og Claude arbejder i en
klon (`/home/claude/bugherrer`, branch `main`). Fremover: Claude retter, committer
og pusher direkte herfra — ingen tar-fil, ingen manuel udpakning. Denne note er
selve test-pushet der bekræfter at det virker. Næste trin: slå **Auto Deploy** til
i Coolify, så deploy også sker automatisk ved push.

---

## 2026-10-24 — Relativ dato på fejlkortene

**Ønske (Torben):** Hold det simpelt — kategorisering/manual er parkeret. Der skal
automatisk sættes en dato på de meldinger der kommer ind, vist **på fejlkortene** på
forsiden og **relativt** ("for 2 dage siden").

**Lavet:**
- Ny `lib/tid.ts` med `relativTid(sqliteDato)` — dansk relativ tid. SQLite gemmer
  tidsstempler som UTC uden zone-marker, så vi tilføjer `'Z'` ved parsing, ellers
  bliver forskellen forkert. Intervaller: `lige nu` → `for X min. siden` →
  `for X timer siden` → `i går` → `for X dage siden` → `for X uger siden` →
  `for X måneder siden` → `for X år siden` (med korrekt ental/flertal).
- `components/FejlListe.tsx`: viser `🕑 {relativTid(f.oprettet)}` i meta-rækken på
  hvert kort (efter status-tag).

**Vigtigt:** Datoen var allerede gemt i databasen hele tiden
(`fejl.oprettet DEFAULT (datetime('now'))`) — så dette er **kun visning**, ingen
database-ændring. Gamle meldinger får også deres rigtige dato vist med det samme.

**Detaljesiden** (`/fejl/[id]`) viser stadig den fulde dato ("Meldt 23. oktober 2026")
— det er bevidst som "zoom-ind"-kontekst og passer fint med det relative på kortene.

**Verificeret:** unit-test af alle intervaller gav korrekt dansk; `npm run build`
kompilerer rent og genererer `/`-ruten.

---

## 2026-10-23 — Idé-backlog (Torbens noter)

1. **Zeekr-modtager af rapporterne (research).** Find den rigtige kontakt hos
   Zeekr DK/EU (kundeservice? kvalitet? importør?) så PDF-rapporterne lander et
   sted der tages alvorligt. Research-opgave — ikke gjort endnu.

2. **Kategorier via Zeekrs brugermanual.** I stedet for at opfinde kategorier:
   lån strukturen fra Zeekrs officielle 7GT-manual som skelet. Fordele: autoritativ
   færdig taksonomi, genkendelig for ejere, og rapporten til Zeekr taler deres eget
   sprog (sorteret efter deres manual-sektioner → nemmere for dem at placere).
   Manual-link (dansk 7GT 2026): zeekr.eu/manual-result (vk=AAF9&yk=MZ18&lk=da_DK&vn=7GT).
   NB: dette afløser den tidligere "vent med kategorier"-holdning — manual-vinklen
   løser spørgsmålet om HVEM der vælger kategorien (den er fast/neutral).
   Implementering: admin sætter kategori fra en dropdown bygget på manualens sektioner.

3. **"Nyttige links"-side.** Kurateret side med anbefalinger/links (måtter, fælge,
   covers osv.) — samme logik som selve boardet: Facebook er dårlig til at samle
   tilbagevendende viden. Giver folk endnu en grund til at bruge bugherrer.dk.

---

## 2026-10-23 (status) — Spam-værn LIVE + næste: i18n

**Spam-værnet er nu aktivt i produktion:**
- Turnstile-captcha tændt (nøgler sat i Coolify, widget vises + verificerer "Succes!").
- Bot Fight Mode slået til i Cloudflare (Security → Settings → Detection tools).
- Honeypot + rate-limiting kører. Alle fire lag live.
- Test-oprettelse gik glat igennem. Bugherrer er klar til offentligheden.
- (Cloudflare "Continuous script monitoring" / Page Shield: bevidst slukket —
  mest relevant for betalingssider, ville bare støje ved hvert deploy. Advarslen
  dér er harmløs.)

**NÆSTE STORE OPGAVE — i18n (flersproget):**
Torbens vision: oversæt til svensk (og norsk), få de nordiske Zeekr 7GT-grupper
med → mere pondus over for Zeekr med flere lande bag de bekræftede fejl.
Teknisk: byg i18n-klar så alle UI-tekster ligger i sprogfiler (da/sv/no) i stedet
for hardkodet. Så bliver et nyt sprog "bare" en oversættelsesfil + en sprog-vælger,
ikke en ombygning. Bugherrer er lille nok til at det er overkommeligt at i18n'e nu.
Overvej: skal brugerens sprog følge valg, browser-sprog, eller domæne (fx .se)?

---

## 2026-10-23 (opdatering) — Spam-værn bygget (Turnstile + honeypot + rate-limit)

Fire lag, designet til minimal brugerfriktion + nul server-belastning (meste på
Cloudflare-niveau). Bygget FØR linket deles bredt i FB-gruppen.

**Kode (bygget, testet, i repo):**
- lib/turnstile.ts — verificerer Cloudflare Turnstile server-side + klient-IP (CF-Connecting-IP).
- lib/ratelimit.ts — in-memory rate-limit: opret 5/time, kommentar 15/time pr. IP.
- components/Turnstile.tsx — usynlig captcha-widget (frontend).
- Honeypot-felt (skjult "website"-input) i opret- + kommentar-formular.
- Backend håndhæver alle tre i /api/fejl + /api/kommentar.
- ALT er GRACEFUL: uden Turnstile-nøgler er captcha'en bare slukket, og appen
  virker præcis som før. Værnet "tænder" automatisk når nøglerne sættes.

**Testet lokalt:** normal oprettelse 201 ✅, honeypot-bot gemmes ikke (id:0) ✅,
rate-limit giver 429 efter grænse ✅, build grønt ✅.

**MANGLER — Torben skal gøre dette i Cloudflare (dashboard):**
1. Turnstile-nøgler: Cloudflare → Turnstile → Add widget (domæne bugherrer.dk) →
   få Site Key + Secret Key. Sæt i Coolify env:
     NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>
     TURNSTILE_SECRET_KEY=<secret key>
   → redeploy. SÅ er captcha'en aktiv.
2. Bot Fight Mode: Cloudflare → bugherrer.dk → Security → Bots → slå til (gratis, ét klik).
3. (Valgfrit) Cloudflare Rate Limiting-regel som ekstra lag på /opret.

Rate-limit + honeypot virker ALLEREDE efter push (kræver ingen nøgler). Turnstile
tænder først når nøglerne er sat i Coolify.

---

## 2026-10-23 (MILEPÆL) — bugherrer.dk er LIVE via Cloudflare Tunnel 🎉

Bugherrer er nu tilgængelig udefra på https://bugherrer.dk med gratis HTTPS.
Verificeret: HTTPS-hængelås ✅, virker fra telefon på mobildata (altså ægte
ekstern adgang, ikke kun LAN) ✅, admin-login virker over HTTPS ✅.

**Sådan er det sat op (vigtigt for Lejesyn + fremtid):**
- Domæne: bugherrer.dk købt hos Simply.com (.dk via DK Hostmaster).
- DNS flyttet til Cloudflare: DNSSEC slået FRA hos Simply FØRST, derefter
  nameservers skiftet til Cloudflares (javon.ns.cloudflare.com +
  kayleigh.ns.cloudflare.com). (Rækkefølgen er kritisk — DNSSEC før nameservers,
  ellers bliver domænet utilgængeligt.)
- Cloudflare Tunnel "pixa" oprettet (Cloudflare → Networking → Tunnels),
  type Cloudflared. Tunnel ID noteret i Cloudflare-dashboardet.
- cloudflared kører som Docker-container PÅ Pixa, startet via Coolify-terminal
  på "localhost" med:
    docker run -d --restart unless-stopped --name cloudflared \
      cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <TOKEN>
  (-d + --restart unless-stopped = permanent, overlever genstart.)
- Public hostname (route): bugherrer.dk → Service URL http://192.168.1.18:3000
  (HTTP internt; Cloudflare lægger HTTPS udenpå). Cloudflare oprettede DNS-CNAME
  automatisk.
- Port-mapping 3000:3000 i Coolify SKAL BLIVE — tunnelen når appen via den.

**Lejesyn (næste, nemt):** Samme pixa-tunnel. Tilføj bare en ny "Published
application" i tunnelen: lejesyn.dk → http://192.168.1.18:<lejesyns port>.
Ingen ny tunnel/connector nødvendig. (Lejesyn.dk's DNS skal dog også flyttes
til Cloudflare først, samme DNSSEC-først-procedure.)

**Stadig på to-do (ikke gjort):**
- Spam-værn (Cloudflare Turnstile + rate-limiting på opret/kommentar) FØR linket
  deles bredt i FB-gruppen.
- Parkerede features: status-filter på forsiden, evt. emne-kategorier (admin-sat),
  "Mine bugherrer" (localStorage) + delbar kvittering.
- Supabase-backup (scheduled) — rigtige data findes kun på Pixa.

---

## 2026-10-23 (opdatering 5) — Brandnavn: ental → flertal (Bugherrer)

**Beslutning:** Brandnavnet skiftet fra "Bugherre" (ental) til "Bugherrer" (flertal).
Begrundelse (Torbens): Zeekr-appen skriver selv fejloversættelsen i FLERTAL
("Bygherrer"), så flertal er den tro form at læne sig op ad — og siden er en
samling af fejl, ikke én. Nu matcher navn (Bugherrer) og domæne (bugherrer.dk).

Ændret: SITE_NAME-default (config.ts) + .env.example, banner (page.tsx),
PDF-titel ("BUGHERRER-RAPPORT"), entrypoint-echo, README.
IKKE ændret: grammatisk ental/flertal i UI ("Meld en bugherre" = én fejl,
"8 bugherrer" = antal) — det er korrekt dansk i konteksten og skal blive.
Verificeret med render-test: banner "Velkommen til Bugherrer", titel korrekt,
"Meld en bugherre" stadig ental.

**Domæne:** bugherrer.dk (flertal, med U) — begge bugherre.dk og bugherrer.dk var
ledige; valgt flertal. Skift i Coolify: SITE_NAME=Bugherrer (eller lad den stå tom,
da default nu er Bugherrer), SITE_DOMAIN=bugherrer.dk (allerede sat).

---

## 2026-10-23 (status) — Klar til ekstern adgang via Cloudflare Tunnel

**Appen er live lokalt på Pixa** (http://192.168.1.18:3000 via port-mapping 3000:3000)
og fuldt funktionel: dansk sprog rigtigt overalt, database re-seedet med pæne
7GT-eksempler, admin + PDF virker, login-link i footer.

**Næste opgave: Cloudflare Tunnel** så bugherrer.dk kan tilgås udefra.
Forudsætninger:
- Torben HAR en Cloudflare-konto ✅
- Mangler: at købe domænet bugherrer.dk (hos dansk registrar, skal kunne flytte
  nameservers til Cloudflare — .dk understøttes af Cloudflare free plan)

Vigtig arkitektur-note:
- Cloudflare Tunnel kræver INGEN fast offentlig IP (udgående forbindelse fra Pixa).
  Dynamisk IP fra udbyder er helt fint.
- Lokal IP 192.168.1.18 bør reserveres i routeren (DHCP-reservation) hvis tunnelen
  peger direkte på den; ellers kan tunnelen tale med appen via Coolifys interne
  Docker-netværk (coolify-proxy) og så er den lokale IP ligegyldig.

Plan (4 etaper) når domænet er købt:
1. Læg bugherrer.dk på Cloudflare → flyt nameservers → vent på propagering
2. Opret tunnel i Cloudflare Zero Trust (Networks → Tunnels) → få Docker-token
3. Kør cloudflared-connector på Pixa som container (via Coolify: Docker Image
   cloudflare/cloudflared, command: tunnel --no-autoupdate run --token <TOKEN>)
4. Public hostname bugherrer.dk → service (coolify-proxy:80 med domæne sat i
   Coolify Manage Domains, ELLER direkte http://192.168.1.18:3000)
→ Når tunnelen kører, tilføjes Lejesyn senere bare som ekstra public hostname i
  SAMME tunnel (trin 3 er engangsarbejde).

Husk: slet ALDRIG /app/data-volumen igen efter rigtige brugerindlæg er kommet —
det ville slette ægte data. DB-reset er kun sikkert nu med ren eksempeldata.

---

## 2026-10-23 (opdatering 4) — Sidste sprogfejl: disclaimer

**Fundet:** Footer-disclaimeren (DISCLAIMER i lib/config.ts) sagde "uafhaengigt"
→ rettet til "uafhængigt". Vises både i footeren og i PDF-rapporten.

**Verificeret med render-test:** Byggede, kørte serveren, hentede forside, /opret,
/fejl/[id], /admin OG PDF-rapporten, og søgte i det FAKTISKE renderede output efter
danske ae/oe/aa-ord. Resultat: alle sider + PDF 100% rene. Nu er alt brugervendt
korrekt dansk. (Kun kode-kommentarer/variabelnavne har stadig ae/oe/aa — usynligt.)

---

## 2026-10-23 (opdatering 3) — Login-link på forsiden + dansk sprog-gennemgang

**Login på forsiden:** Tilføjet diskret "🔐 Formandens login"-link i footeren
(Footer.tsx) → fører til /admin. Findes på alle sider inkl. forsiden.

**Dansk sprog:** Rettet ae/oe/aa → æøå i al BRUGERVENDT tekst:
- seed.mjs: alle 8 eksempelfejls titler/beskrivelser + kommentarer (Klimaanlæg,
  skærmen, forstår, blæser, værdier, på, når, kører, åbner osv.)
- Rettede også to gamle modelreferencer i seed-kommentarer ("min 001"/"min X" → "min 7GT")
  og "roundabouts" → "rundkørsler".
- UI-strenge, PDF-rapport og fejlbeskeder var ALLEREDE korrekt dansk — de eneste
  ae/oe/aa dér er variabelnavne/CSS-klasser/kode-kommentarer, som brugeren aldrig ser.

**VIGTIGT — databasen skal nulstilles for at se de pæne seed-data:**
Den kørende DB på Pixa blev seedet med de GAMLE (ae/oe/aa) eksempeldata, og seed
kører kun når DB er tom. For at få de pæne danske eksempler ind:
→ Slet volume i Coolify (Storages → fjern /app/data-volumen) ELLER slet de 8
  eksempelfejl i /admin, og redeploy. Da der kun er eksempeldata (ingen rigtige
  brugerindlæg endnu), er det helt harmløst.
(Når rigtige brugere begynder at melde fejl, er seed-data irrelevant alligevel.)

**Stadig åbne kommentarer i koden:** Kode-KOMMENTARER (ikke brugervendt) har stadig
ae/oe/aa flere steder. Rent kosmetisk, usynligt for brugeren — kan ryddes senere hvis ønsket.

---

## 2026-10-23 (opdatering 2) — Admin-login virker nu over HTTP

**Problem:** Admin-login hang på "Logger ind…" ved lokal test via
http://192.168.1.18:3000. Årsag: session-cookien havde `secure: true` i
produktion (NODE_ENV=production), men secure-cookies afvises af browseren
over HTTP. Så login lykkedes server-side, men cookien blev aldrig gemt.

**Fiks:** `startSession()` i lib/auth.ts sætter nu `secure` dynamisk ud fra
`x-forwarded-proto`-headeren (true kun når forbindelsen faktisk er HTTPS).
Virker automatisk både over lokal HTTP og over HTTPS via Cloudflare/Traefik —
ingen env-variabel at huske.

**Status:** Appen kører og er verificeret lokalt på Pixa via port-mapping
3000:3000 (http://192.168.1.18:3000). Forside, 7GT-data, søgning, temaet — alt virker.
Ingen ekstern adgang endnu (Cloudflare Tunnel ikke sat op — hverken Lejesyn
eller Bugherre er tilgængelige udefra pt.).

---

## 2026-10-23 — Første Coolify-deploy: fiks af tom public-mappe

**Problem:** Første deploy på Pixa/Coolify fejlede i Docker-buildet på
`COPY --from=builder /app/public ./public: "/app/public": not found`.
Byggeriet kørte ellers rent hele vejen (npm ci, next build, standalone).
Årsag: `public/` var tom, og git tager ikke tomme mapper med i en commit —
så mappen manglede på GitHub, og Dockerfilens COPY fandt ingenting.

**Fiks (to lag):**
1. Tilføjet `public/robots.txt` (rigtig fil → mappen findes permanent i git;
   og nyttig for en offentlig side — tillader alt, dog Disallow: /admin).
2. Gjort Dockerfilen robust: `RUN mkdir -p public` i builder-stagen, så et
   fremtidigt tomt public aldrig vælter buildet igen.

**Deploy-status:** Miljøet i Coolify er sat op korrekt:
- Build strategy: Dockerfile, port 3000, base dir /
- Env: ADMIN_PASSWORD, SESSION_SECRET, DATABASE_PATH=/app/data/bugherrer.db,
  SITE_DOMAIN=bugherrer.dk, SITE_NAME=Bugherre
- Persistent volume monteret på /app/data (databasen overlever redeploys)
Efter push af denne fiks skulle redeploy gå igennem.

**Note:** Coolify-build advarer om `SecretsUsedInArgOrEnv` (ADMIN_PASSWORD/SESSION_SECRET
som ENV) — det er kun en advarsel, ikke en fejl. Kan ignoreres for en hobby-app;
hvis det senere skal være pænere, kan de flyttes til Docker build secrets.

---

## 2026-10-22 (opdatering 2) — Navn + 7GT-fokus

**Beslutninger truffet med Torben:**
- Domæne landede på **bugherrer.dk** (ikke bygherrer-listen.dk). Bedre ordspil (bug → bugherre).
- **Navn samlet under ét: "Bugherre"** — ændret overalt i UI, PDF, titler, SITE_NAME-default.
  (Tekniske navne som db-fil, cookies og pakkenavn er bevidst IKKE omdøbt — usynlige for brugeren.)
- **Boardet er pt. begrænset til Zeekr 7GT.** Model-dropdownen er væk fra opret-formularen;
  bilmodel vises som fast info-boks og tvinges server-side til "Zeekr 7GT".
  Model-CHIPPEN på kortene er BEHOLDT, så vi er forberedt hvis det senere åbnes for flere modeller.
  Åbning for flere modeller = sæt BILMODELLER-arrayet i lib/config.ts til flere værdier;
  så dukker dropdownen op af sig selv (KUN_EN_MODEL beregnes af array-længden).
- Seed-data er opdateret: alle 8 eksempelfejl er nu Zeekr 7GT med OS 1.2.x/1.3.x-versioner.
  (Opdigtede versionsnumre — Torben kan indsætte rigtige 7GT-versioner; seed vaskes alligevel
  væk af de første ægte indlæg.)

**Testet igen efter ændringerne:**
- ✅ Build kompilerer rent
- ✅ Forside viser "Bugherre" + "Zeekr 7GT"; gammelt navn helt væk
- ✅ Opret UDEN bilmodel i payload lykkes (backend tvinger 7GT), oprettet fejl får 7GT
- ✅ PDF-rapport: "BUGHERRE-RAPPORT", "Zeekr 7GT-ejere", alle poster Model: Zeekr 7GT, disclaimer OK

**Drøftet men IKKE bygget (bevidst):**
- Brugeroprettelse/login: fravalgt for v1. Siden skal være ligetil og ikke overtage FB-gruppen.
  "Finde tilbage" + "svare" dækkes uden konti (kommentarspor er åbent; delbar fejl-URL).
  Login (evt. magic-link) gemmes til hvis et konkret behov melder sig.
- Endnu ikke bygget: "Mine bugherrer" (localStorage), kvittering m. delbar URL,
  samt Turnstile + rate-limiting (spam-værn inden linket deles bredt i FB-gruppen).
  → Næste oplagte opgave før go-live.

---

## 2026-10-22 — Første version bygget

**Hvad er lavet:**
- Komplet Next.js 14-app (App Router) scaffoldet fra bunden.
- SQLite (better-sqlite3) med tabeller: `fejl`, `kommentarer`, `stemmer_log`.
- Fuzzy-søgning med Fuse.js — testet og tunet (threshold 0.6), så "lading" finder "Opladning".
- Forside: banner, søgebar, kort, upvote, sortering (stemmer/nyeste).
- Opret-flow med 3 trin: tvungen søgning → Fejl 40-tjek → formular.
- Dublet-blokering både i frontend og som backend-sikkerhedsnet (409).
- Detaljeside + kommentarspor.
- Admin bag kodeord (HMAC-signeret cookie, 8 t): status-skift, slet, eksport.
- PDF-rapport (pdfkit) + CSV (semikolon + BOM til LibreOffice/Excel).
- Disclaimer i footer på alle sider + i PDF.
- Dockerfile (standalone, non-root, SQLite-volume) + entrypoint der auto-seeder.
- README med Coolify-guide.

**Testet ende-til-ende (standalone server.js, som Docker kører):**
- ✅ Health, forside, detaljeside loader
- ✅ Fuzzy-søgning: lading→Opladning, bagklap→Bagagerum, carplay, klima
- ✅ Upvote + dublet-beskyttelse via cookie (allerede:true anden gang)
- ✅ Opret dublet blokeres (409), gyldig oprettelse (201)
- ✅ Kommentar oprettes
- ✅ Admin: forkert kodeord 401, korrekt 200, auth-beskyttelse på status-route
- ✅ CSV- og PDF-eksport genereres korrekt; æøå renderer rent; sidetal + disclaimer OK

**Beslutninger / noter:**
- **Next 14.2.35** (ikke 14.2.18) — den oprindelige havde en sikkerhedsadvarsel.
  npm audit foreslår Next 16 (major jump) for resterende advisories, men de
  konkrete sårbarheder (Image Optimizer remotePatterns, RSC-deserialisering,
  rewrite-smuggling) rammer **ikke** denne app, som ikke bruger de features.
  Resten af advisories er build-time dev-deps (braces/postcss/tailwind), ikke i
  runtime-imaget. Konklusion: bliv på 14.2.35; planlæg evt. Next 16 som egen opgave.
- PDF via pdfkit (ikke Puppeteer) → intet Chromium i imaget → lille, hurtig container.
- Domæne/navn er env-variabler (`SITE_DOMAIN`, `SITE_NAME`) → skift domæne uden kodeændring.
  (Du overvejer `bugherrer.dk` frem for `bygherrer-listen.dk` — begge virker, bare sæt env.)

**Næste skridt / idéer (ikke lavet endnu):**
- Evt. simpel rate-limiting på opret/kommentar (mod spam).
- Evt. e-mail-notifikation når en fejl skifter til "Løst!".
- Overvej Turnstile/hCaptcha på opret hvis spam bliver et problem.
