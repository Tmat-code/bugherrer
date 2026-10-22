# HANDOVER — Bygherrer-Listen

Løbende status-log. Opdateres ved hver ændring.

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
