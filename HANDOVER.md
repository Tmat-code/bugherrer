# HANDOVER — Bugherre

Løbende status-log. Opdateres ved hver ændring.

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
