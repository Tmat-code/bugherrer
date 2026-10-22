# 🛠️ Bygherrer-Listen

Et uafhængigt, fællesskabsdrevet fejl-board for Zeekr-ejere. Samler software­fejl
("bygherrer" — ja, det er sådan bil-appen oversætter _bugs_ 😅), lader ejere stemme
dem op og bekræfte dem sammen, og eksporterer de mest bekræftede fejl i en pæn
rapport, der kan sendes til producenten/importøren.

Humoristisk byggeplads-tema, men et seriøst værktøj.

---

## Teknologi

| Lag | Valg |
|-----|------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (byggeplads-palet: hjelmegul / asfaltsort) |
| Database | SQLite via `better-sqlite3` (én fil i en Docker-volume) |
| Fuzzy-søgning | Fuse.js (finder "Opladning" selv når man søger "lading") |
| PDF-rapport | `pdfkit` (ingen browser/Chromium nødvendig) |
| Container | Standalone Docker-image, klar til Coolify |

## Funktioner

- **Forside:** banner, stor fuzzy-søgebar, fejl-kort med upvote, sortering (flest stemmer / nyeste).
- **Opret-flow med dobbeltfilter:**
  1. _Tvungen søgning_ — blokerer dubletter og foreslår at stemme i stedet.
  2. _"Fejl 40"-tjek_ — minder om at genstarte skærmen først.
  3. Formular: titel, bilmodel (dropdown), softwareversion, reproduktion.
- **Detaljeside** med kommentarspor, så fællesskabet selv kan løse betjeningsfejl.
- **Admin (`/admin`)** bag kodeord: skift status, slet, og eksportér.
- **Eksport:** flot PDF-rapport + CSV (semikolon + BOM, åbner rent i LibreOffice Calc / Excel).
- **Disclaimer** i footeren på alle sider (også i PDF'en).

---

## Kør lokalt

```bash
npm install
cp .env.example .env          # ret ADMIN_PASSWORD og SESSION_SECRET
npm run seed                  # (valgfrit) fyld med eksempeldata
npm run dev                   # http://localhost:3000
```

> Bemærk: produktions­build bruger `output: standalone`, så `npm start` virker ikke.
> Kør i stedet `node .next/standalone/server.js` (det gør Docker automatisk).

## Byg og kør i Docker (som Coolify gør)

```bash
docker build -t bygherrer-listen .
docker run -p 3000:3000 \
  -e ADMIN_PASSWORD='dit-kodeord' \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -v bygherrer-data:/app/data \
  bygherrer-listen
```

Databasen seedes automatisk første gang volumen er tom.

---

## Deploy i Coolify

1. **New Resource → Application → fra din GitHub-repo.**
2. Build pack: **Dockerfile** (Coolify finder `Dockerfile` i roden automatisk).
3. **Port:** `3000`.
4. **Persistent Storage:** tilføj en volume mounted på `/app/data`
   (så databasen overlever redeploys). Dette er det vigtigste trin!
5. **Environment variables:**
   | Navn | Værdi |
   |------|-------|
   | `ADMIN_PASSWORD` | dit admin-kodeord |
   | `SESSION_SECRET` | en lang tilfældig streng (`openssl rand -hex 32`) |
   | `DATABASE_PATH` | `/app/data/bygherrer.db` |
   | `SITE_DOMAIN` | `bugherrer.dk` (eller hvad du vælger) |
   | `SITE_NAME` | `Bygherrer-Listen` |
6. Peg dit domæne på applikationen, og lad Coolify stå for TLS.
7. Deploy. Health-check: `GET /api/health`.

> **Skift domæne uden at røre koden:** sæt bare `SITE_DOMAIN` og `SITE_NAME`.
> Disclaimer og titler læser fra dem.

---

## Projektstruktur

```
app/
  layout.tsx            # global ramme (header + footer)
  page.tsx              # forside
  opret/page.tsx        # opret-flow (3 trin)
  fejl/[id]/page.tsx    # detaljeside + kommentarer
  admin/page.tsx        # login ELLER dashboard
  not-found.tsx
  api/
    fejl/route.ts         # GET (lignende) + POST (opret, m. dublet-tjek)
    upvote/route.ts
    kommentar/route.ts
    health/route.ts
    admin/
      login|logout|status|slet/route.ts
      export/route.ts        # PDF
      export/csv/route.ts    # CSV
components/            # Header, Footer, FejlListe, OpretFlow, Kommentarspor, Admin* …
lib/
  config.ts           # domæne, navn, modeller, statusser, disclaimer
  db.ts               # SQLite-skema + queries
  search.ts           # Fuse.js
  auth.ts             # admin-session (HMAC-cookie)
  voteToken.ts        # anonymt stemme-token
scripts/seed.mjs      # eksempeldata
Dockerfile
docker-entrypoint.sh  # seeder hvis DB tom, starter server
```

---

**Juridisk:** `bugherrer.dk` er et 100% uafhængigt, privat initiativ drevet af og
for bilentusiaster. Siden er ikke tilknyttet, sponsoreret eller godkendt af ZEEKR
Denmark ApS, Geely eller deres datterselskaber.
