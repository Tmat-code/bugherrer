# HANDOVER — Bugherre

Løbende status-log. Opdateres ved hver ændring.

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
