import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// --- Databasesti ---
// I produktion (Coolify) peger DATABASE_PATH paa en persistent volume, fx /app/data/bygherrer.db.
// Lokalt falder vi tilbage til ./data/bygherrer.db.
//
// VIGTIGT: under `next build` importeres alle API-ruter for at "samle page data", hvilket
// aabner denne DB ved import. Vi maa IKKE aabne/laase prod-volumen (eller koere migreringer
// mod den) under build — den koerende container holder filen laast (WAL), hvilket giver
// "database is locked" og vaelter build'et. Under build bruger vi derfor en flygtig
// in-memory DB: skemaet oprettes friskt, ruterne kan importeres, og volumen roeres ikke.
const ER_BUILD = process.env.NEXT_PHASE === 'phase-production-build';
const DB_PATH = ER_BUILD
  ? ':memory:'
  : process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bygherrer.db');

// Sikr at mappen findes (kun for en rigtig fil; ikke for :memory:).
if (DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// --- Singleton ---
// Next.js hot-reloader kan koere modulet flere gange i dev; vi genbruger forbindelsen.
const globalForDb = globalThis as unknown as { __bygherrerDb?: Database.Database };

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // bedre samtidighed
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export const db: Database.Database =
  globalForDb.__bygherrerDb ?? createConnection();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__bygherrerDb = db;
}

// --- Skema ---
function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fejl (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      titel         TEXT NOT NULL,
      bilmodel      TEXT NOT NULL,
      softwareversion TEXT NOT NULL,
      beskrivelse   TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'Undersøges',
      stemmer       INTEGER NOT NULL DEFAULT 1,
      oprettet      TEXT NOT NULL DEFAULT (datetime('now')),
      opdateret     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kommentarer (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      fejl_id   INTEGER NOT NULL,
      navn      TEXT NOT NULL DEFAULT 'Anonym bygmester',
      tekst     TEXT NOT NULL,
      oprettet  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (fejl_id) REFERENCES fejl(id) ON DELETE CASCADE
    );

    -- Simpel stemme-sporing pr. browser-token, saa man ikke nemt dobbelt-stemmer.
    CREATE TABLE IF NOT EXISTS stemmer_log (
      fejl_id  INTEGER NOT NULL,
      token    TEXT NOT NULL,
      oprettet TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (fejl_id, token),
      FOREIGN KEY (fejl_id) REFERENCES fejl(id) ON DELETE CASCADE
    );

    -- Cache af oversatte fejl-tekster (titel + beskrivelse) pr. sprog.
    -- kilde_hash gemmer et aftryk af den danske kildetekst, saa cachen
    -- automatisk bliver "ugyldig" hvis fejlen redigeres (anden hash = ny oversaettelse).
    CREATE TABLE IF NOT EXISTS oversaettelser (
      fejl_id     INTEGER NOT NULL,
      sprog       TEXT NOT NULL,
      kilde_hash  TEXT NOT NULL,
      titel       TEXT NOT NULL,
      beskrivelse TEXT NOT NULL,
      oprettet    TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (fejl_id, sprog),
      FOREIGN KEY (fejl_id) REFERENCES fejl(id) ON DELETE CASCADE
    );

    -- Simpel key/value til smaa server-side vaerdier (fx admins "sidst set"-tidspunkt).
    CREATE TABLE IF NOT EXISTS meta (
      noegle TEXT PRIMARY KEY,
      vaerdi TEXT NOT NULL
    );

    -- Henvendelser fra kontaktformularen (vises i admin).
    CREATE TABLE IF NOT EXISTS henvendelser (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      navn     TEXT NOT NULL DEFAULT '',
      email    TEXT NOT NULL DEFAULT '',
      besked   TEXT NOT NULL,
      oprettet TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Ekstra admin-adgange (ud over formandens master-kodeord). Hver adgang har en
    -- rolle: 'admin' (alt) eller 'moderator' (daglig moderation). Koden gemmes KUN
    -- som hash (noeglet med SESSION_SECRET), aldrig i klartekst.
    CREATE TABLE IF NOT EXISTS admin_adgange (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      navn        TEXT NOT NULL,
      rolle       TEXT NOT NULL DEFAULT 'moderator',
      kode_hash   TEXT NOT NULL,
      aktiv       INTEGER NOT NULL DEFAULT 1,
      oprettet    TEXT NOT NULL DEFAULT (datetime('now')),
      sidst_brugt TEXT
    );

    -- Invitationer: formanden opretter én (navn+rolle), sender linket, og personen
    -- vaelger selv sit kodeord via linket (opretter saa en admin_adgange-raekke).
    CREATE TABLE IF NOT EXISTS admin_invitationer (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      navn              TEXT NOT NULL,
      rolle             TEXT NOT NULL DEFAULT 'moderator',
      token             TEXT NOT NULL UNIQUE,
      brugt             INTEGER NOT NULL DEFAULT 0,
      nulstil_adgang_id INTEGER,
      oprettet          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Revisionslog: hvem har downloadet hvilke rapporter, hvornaar (kun synlig i admin).
    CREATE TABLE IF NOT EXISTS rapport_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      navn            TEXT NOT NULL,
      rolle           TEXT NOT NULL,
      format          TEXT NOT NULL,  -- 'pdf' | 'csv'
      type            TEXT NOT NULL,  -- 'fejl' | 'oenske' | 'begge'
      antal           TEXT NOT NULL,  -- '20' | 'alle'
      kun_aendrede    INTEGER NOT NULL DEFAULT 0,
      med_kommentarer INTEGER NOT NULL DEFAULT 0,
      oprettet        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Markerings-batch: hver "Dan Zeekr-rapport" gemmer et snapshot af de ramte
    -- fejls FORRIGE sidst_sendt-vaerdier, saa en markering kan rulles tilbage ("fortryd").
    CREATE TABLE IF NOT EXISTS rapport_markering (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      navn      TEXT NOT NULL,
      rolle     TEXT NOT NULL,
      antal     INTEGER NOT NULL,
      data      TEXT NOT NULL,            -- JSON: [{id, ps (prev stemmer), pd (prev dato)}]
      fortrudt  INTEGER NOT NULL DEFAULT 0,
      oprettet  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Notifikations-tilmeldinger: en bruger kan "følge" en tråd (fejl/ønske) og få
    -- mail ved ny status eller ny kommentar. INGEN login — email + fejl_id er nok.
    -- token bruges til BÅDE bekræft-linket og afmeld-linket. Double opt-in: en ny
    -- tilmelding starter som bekraeftet=0 og får først mail efter bekræft-linket er
    -- klikket, så ingen kan tilmelde en andens adresse (og vi sender aldrig til nogen,
    -- der ikke selv bad om det — godt for domænets omdømme). Mailadressen er den første
    -- rigtige personoplysning på boardet; den ligger kun her i SQLite, ikke i cookies.
    CREATE TABLE IF NOT EXISTS notifikation_tilmelding (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      fejl_id    INTEGER NOT NULL,
      email      TEXT NOT NULL,
      token      TEXT NOT NULL UNIQUE,
      bekraeftet INTEGER NOT NULL DEFAULT 0,
      oprettet   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (fejl_id, email),
      FOREIGN KEY (fejl_id) REFERENCES fejl(id) ON DELETE CASCADE
    );

    -- Udbakke (outbox): hook-stederne (ny kommentar, ny status) SKRIVER bare en
    -- færdig-renderet mail hertil — hurtigt, lokalt, kan ikke fejle request'en. Et
    -- token-beskyttet flush-endpoint (kaldt af n8n på en tidsplan) sender dem via
    -- Resend og sætter sendt. Fejler Resend, bliver rækken liggende (sendt IS NULL)
    -- og prøves igen ved næste flush — så en mail aldrig tabes.
    CREATE TABLE IF NOT EXISTS notifikation_koe (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      email    TEXT NOT NULL,
      emne     TEXT NOT NULL,
      html     TEXT NOT NULL,
      oprettet TEXT NOT NULL DEFAULT (datetime('now')),
      sendt    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_fejl_stemmer ON fejl(stemmer DESC);
    CREATE INDEX IF NOT EXISTS idx_fejl_oprettet ON fejl(oprettet DESC);
    CREATE INDEX IF NOT EXISTS idx_kommentar_fejl ON kommentarer(fejl_id);
    CREATE INDEX IF NOT EXISTS idx_kommentar_oprettet ON kommentarer(oprettet DESC);
    CREATE INDEX IF NOT EXISTS idx_tilmelding_fejl ON notifikation_tilmelding(fejl_id);
    CREATE INDEX IF NOT EXISTS idx_koe_usendt ON notifikation_koe(sendt);
  `);

  // Tilfoej "loesning"-kolonne til eksisterende databaser (peger paa den kommentar
  // der er markeret som loesningen). SQLite har ikke ADD COLUMN IF NOT EXISTS, saa
  // vi proever og ignorerer fejlen hvis kolonnen allerede findes.
  try {
    db.exec(`ALTER TABLE fejl ADD COLUMN loesning_kommentar_id INTEGER`);
  } catch {
    /* kolonnen findes allerede */
  }

  // Meldingstype: 'fejl' (bug) eller 'oenske' (ønske til ny funktionalitet).
  try {
    db.exec(`ALTER TABLE fejl ADD COLUMN type TEXT NOT NULL DEFAULT 'fejl'`);
  } catch {
    /* kolonnen findes allerede */
  }

  // Nulstil-reference på invitationer (til at erstatte en glemt adgangs kodeord).
  try {
    db.exec(`ALTER TABLE admin_invitationer ADD COLUMN nulstil_adgang_id INTEGER`);
  } catch {
    /* kolonnen findes allerede (eller tabellen er lige oprettet med den) */
  }

  // Telefon-oplysninger (valgfrie) — relevante for software-/forbindelsesfejl,
  // ligesom Zeekrs egen app spoerger til telefon + OS.
  for (const kolonne of ['telefon TEXT', 'telefon_os TEXT']) {
    try {
      db.exec(`ALTER TABLE fejl ADD COLUMN ${kolonne}`);
    } catch {
      /* kolonnen findes allerede */
    }
  }

  // Eksport-sporing: naar en fejl sidst blev taget med i en afsendt rapport,
  // og hvor mange stemmer den havde dengang. Bruges til at vise "NY" / "+N siden
  // sidst" og til at kunne udelade uaendrede, allerede sendte fejl.
  // loest_dato: saettes manuelt naar Zeekr har fikset fejlen (status "Løst!"). De oevrige
  // statusser udledes automatisk (se beregnStatus i config), saa dette er det ENESTE
  // manuelle status-felt.
  for (const kolonne of ['sidst_sendt_stemmer INTEGER', 'sidst_sendt_dato TEXT', 'loest_dato TEXT']) {
    try {
      db.exec(`ALTER TABLE fejl ADD COLUMN ${kolonne}`);
    } catch {
      /* kolonnen findes allerede */
    }
  }

  // "Bil-bekraeftet": et let ejerskabs-signal. Efter at have stemt kan en bruger
  // med ét tryk vaelge sin 7GT-variant (Zeekrs egne navne) og dermed bekraefte, at
  // vedkommende selv ejer bilen. Vi gemmer KUN variant-navnet paa stemmen — ingen
  // VIN, intet personhenfoerbart. "Bil-bekraeftet" = ejer_variant er sat (ikke NULL).
  // Giver baade et separat, mere troveardigt tal OG en variant-opdeling til Zeekr.
  try {
    db.exec(`ALTER TABLE stemmer_log ADD COLUMN ejer_variant TEXT`);
  } catch {
    /* kolonnen findes allerede */
  }

  // Tidspunkt for bil-bekraeftelsen (naar varianten blev valgt). Bruges til at maale
  // hvor hurtigt "med" -> variant sker (lynhurtige valg kan tyde paa scriptet misbrug).
  try {
    db.exec(`ALTER TABLE stemmer_log ADD COLUMN ejer_variant_tid TEXT`);
  } catch {
    /* kolonnen findes allerede */
  }
}

// --- Typer ---
export interface Fejl {
  id: number;
  type: string; // 'fejl' | 'oenske'
  titel: string;
  bilmodel: string;
  softwareversion: string;
  beskrivelse: string;
  status: string;
  stemmer: number;
  oprettet: string;
  opdateret: string;
  loesning_kommentar_id: number | null; // kommentar markeret som loesning, eller null
  telefon: string | null; // fx "iPhone 15 Pro" — valgfri
  telefon_os: string | null; // fx "iOS 18.1" — valgfri
  sidst_sendt_stemmer: number | null; // stemmetal da fejlen sidst blev sendt i en rapport
  sidst_sendt_dato: string | null; // hvornaar fejlen sidst blev markeret som sendt
  loest_dato: string | null; // sat manuelt naar Zeekr har fikset fejlen (status "Løst!")
}

export interface Kommentar {
  id: number;
  fejl_id: number;
  navn: string;
  tekst: string;
  oprettet: string;
}

// Fejl beriget med svar-info til forsiden (antal kommentarer + seneste aktivitet).
export interface FejlMedSvar extends Fejl {
  antal_kommentarer: number;
  antal_ejer_bekraeftet: number; // antal stemmer markeret som "bil-bekraeftet"
  sidste_aktivitet: string; // seneste af (oprettet, nyeste kommentar)
}

export interface Oversaettelse {
  fejl_id: number;
  sprog: string;
  kilde_hash: string;
  titel: string;
  beskrivelse: string;
  oprettet: string;
}

export interface Henvendelse {
  id: number;
  navn: string;
  email: string;
  besked: string;
  oprettet: string;
}

export interface NotifikationTilmelding {
  id: number;
  fejl_id: number;
  email: string;
  token: string;
  bekraeftet: number;
  oprettet: string;
}

export interface KoeMail {
  id: number;
  email: string;
  emne: string;
  html: string;
  oprettet: string;
  sendt: string | null;
}

export interface AdminAdgang {
  id: number;
  navn: string;
  rolle: string; // 'admin' | 'moderator'
  kode_hash: string;
  aktiv: number;
  oprettet: string;
  sidst_brugt: string | null;
}

export interface AdminInvitation {
  id: number;
  navn: string;
  rolle: string;
  token: string;
  brugt: number;
  nulstil_adgang_id: number | null;
  oprettet: string;
}

export interface RapportLog {
  id: number;
  navn: string;
  rolle: string;
  format: string;
  type: string;
  antal: string;
  kun_aendrede: number;
  med_kommentarer: number;
  oprettet: string;
}

export interface RapportMarkering {
  id: number;
  navn: string;
  rolle: string;
  antal: number;
  data: string; // JSON: [{id, ps, pd}]
  fortrudt: number;
  oprettet: string;
}

// --- Forespoergsler ---
export const queries = {
  alleFejl: db.prepare<[], Fejl>(`SELECT * FROM fejl ORDER BY stemmer DESC, oprettet DESC`),

  // Forsiden: fejl + antal svar + seneste aktivitet (til "nyt svar" og aktivitets-sortering).
  alleFejlMedSvar: db.prepare<[], FejlMedSvar>(`
    SELECT
      f.*,
      COUNT(k.id) AS antal_kommentarer,
      (SELECT COUNT(*) FROM stemmer_log sl WHERE sl.fejl_id = f.id AND sl.ejer_variant IS NOT NULL) AS antal_ejer_bekraeftet,
      CASE WHEN MAX(k.oprettet) > f.oprettet THEN MAX(k.oprettet) ELSE f.oprettet END AS sidste_aktivitet
    FROM fejl f
    LEFT JOIN kommentarer k ON k.fejl_id = f.id
    GROUP BY f.id
    ORDER BY f.stemmer DESC, f.oprettet DESC
  `),

  fejlEfterNyeste: db.prepare<[], Fejl>(`SELECT * FROM fejl ORDER BY oprettet DESC`),

  fejlById: db.prepare<[number], Fejl>(`SELECT * FROM fejl WHERE id = ?`),

  opretFejl: db.prepare(`
    INSERT INTO fejl (type, titel, bilmodel, softwareversion, beskrivelse, telefon, telefon_os)
    VALUES (@type, @titel, @bilmodel, @softwareversion, @beskrivelse, @telefon, @telefon_os)
  `),

  // Status udledes nu automatisk (beregnStatus i config). Det eneste manuelle er "Løst!":
  markerLoest: db.prepare(
    `UPDATE fejl SET loest_dato = datetime('now'), opdateret = datetime('now') WHERE id = ?`
  ),
  genaabnFejl: db.prepare(
    `UPDATE fejl SET loest_dato = NULL, opdateret = datetime('now') WHERE id = ?`
  ),

  // Admin-redigering af en fejl (retter slaafejl i meldinger). Aendrer titel,
  // version, beskrivelse og telefon-felter; cache af oversaettelser ugyldiggoeres
  // automatisk, da den er hashet paa titel+beskrivelse.
  opdaterFejl: db.prepare(`
    UPDATE fejl SET
      titel = @titel,
      softwareversion = @softwareversion,
      beskrivelse = @beskrivelse,
      telefon = @telefon,
      telefon_os = @telefon_os,
      opdateret = datetime('now')
    WHERE id = @id
  `),

  sletFejl: db.prepare(`DELETE FROM fejl WHERE id = ?`),

  // Top-fejl der er vaerd at sende: aldrig sendt foer, ELLER vokset siden sidst.
  topFejlKunAendrede: db.prepare<[number], Fejl>(`
    SELECT * FROM fejl
    WHERE sidst_sendt_dato IS NULL OR stemmer > COALESCE(sidst_sendt_stemmer, 0)
    ORDER BY stemmer DESC, oprettet DESC LIMIT ?
  `),

  // Samme to, men filtreret paa type (fejl/oenske) — til type-opdelt eksport.
  topFejlType: db.prepare<[string, number], Fejl>(`
    SELECT * FROM fejl WHERE type = ?
    ORDER BY stemmer DESC, oprettet DESC LIMIT ?
  `),
  topFejlKunAendredeType: db.prepare<[string, number], Fejl>(`
    SELECT * FROM fejl
    WHERE type = ? AND (sidst_sendt_dato IS NULL OR stemmer > COALESCE(sidst_sendt_stemmer, 0))
    ORDER BY stemmer DESC, oprettet DESC LIMIT ?
  `),

  // Markér en fejl som "sendt nu": gem nuvaerende stemmetal som nulpunkt for naeste delta.
  markerSendt: db.prepare(
    `UPDATE fejl SET sidst_sendt_stemmer = stemmer, sidst_sendt_dato = datetime('now') WHERE id = ?`
  ),
  // Gendan en fejls sidst_sendt-vaerdier til et tidligere snapshot (bruges af "fortryd").
  // ps/pd kan vaere null (fejlen var aldrig sendt foer markeringen).
  gendanSidstSendt: db.prepare(
    `UPDATE fejl SET sidst_sendt_stemmer = @stemmer, sidst_sendt_dato = @dato WHERE id = @id`
  ),

  // --- Rapport-markeringer (dan rapport + fortryd) ---
  opretMarkering: db.prepare(
    `INSERT INTO rapport_markering (navn, rolle, antal, data) VALUES (@navn, @rolle, @antal, @data)`
  ),
  // Seneste markering der IKKE er fortrudt — til "fortryd" og til "sidst sendt"-visning.
  sidsteMarkering: db.prepare<[], RapportMarkering>(
    `SELECT * FROM rapport_markering WHERE fortrudt = 0 ORDER BY oprettet DESC, id DESC LIMIT 1`
  ),
  markerMarkeringFortrudt: db.prepare(`UPDATE rapport_markering SET fortrudt = 1 WHERE id = ?`),

  harStemt: db.prepare<[number, string], { n: number }>(
    `SELECT COUNT(*) AS n FROM stemmer_log WHERE fejl_id = ? AND token = ?`
  ),

  logStemme: db.prepare(`INSERT INTO stemmer_log (fejl_id, token) VALUES (?, ?)`),

  taelStemmeOp: db.prepare(
    `UPDATE fejl SET stemmer = stemmer + 1, opdateret = datetime('now') WHERE id = ?`
  ),

  // --- Bil-bekraeftelse (let ejerskabs-signal: variant pr. stemme, intet VIN) ---
  // Saetter variant paa den aktuelle browsers stemme for en fejl. .changes = 0 betyder
  // at browseren ikke har stemt paa fejlen endnu.
  bekraeftEjer: db.prepare(
    `UPDATE stemmer_log SET ejer_variant = @variant, ejer_variant_tid = datetime('now')
     WHERE fejl_id = @fejlId AND token = @token`
  ),
  antalEjerBekraeftet: db.prepare<[number], { n: number }>(
    `SELECT COUNT(*) AS n FROM stemmer_log WHERE fejl_id = ? AND ejer_variant IS NOT NULL`
  ),
  // Variant-opdeling til eksporten, fx [{variant:'Long Range RWD', n:4}, ...].
  ejerVarianter: db.prepare<[number], { variant: string; n: number }>(
    `SELECT ejer_variant AS variant, COUNT(*) AS n FROM stemmer_log
     WHERE fejl_id = ? AND ejer_variant IS NOT NULL
     GROUP BY ejer_variant ORDER BY n DESC`
  ),

  // --- Snyd-detektion (admin) ---
  // Aktivitet pr. browser-token: hvor mange stemmer, hvor mange bekraeftelser, hvor
  // mange FORSKELLIGE varianter (>1 = roedt flag: én person ejer kun én bil), og tidsspan.
  tokenAktivitet: db.prepare<
    [],
    {
      token: string;
      stemmer: number;
      bekraeftelser: number;
      distinkte_varianter: number;
      foerste: string;
      sidste: string;
    }
  >(`
    SELECT token,
      COUNT(*)                        AS stemmer,
      COUNT(ejer_variant)             AS bekraeftelser,
      COUNT(DISTINCT ejer_variant)    AS distinkte_varianter,
      MIN(oprettet)                   AS foerste,
      MAX(oprettet)                   AS sidste
    FROM stemmer_log
    GROUP BY token
    ORDER BY stemmer DESC, distinkte_varianter DESC
  `),

  // Tidspunkter til "hvor hurtigt sker med -> variant": stemme-tid + bekraeftelses-tid.
  bekraeftelsesTider: db.prepare<[], { oprettet: string; tid: string }>(
    `SELECT oprettet, ejer_variant_tid AS tid FROM stemmer_log WHERE ejer_variant_tid IS NOT NULL`
  ),

  // --- Oprydning: fjern stemmer (med-klik) foer en dato ---
  antalStemmerFoer: db.prepare<[string], { n: number }>(
    `SELECT COUNT(*) AS n FROM stemmer_log WHERE oprettet < ?`
  ),
  stemmerFoerPerFejl: db.prepare<[string], { fejl_id: number; n: number }>(
    `SELECT fejl_id, COUNT(*) AS n FROM stemmer_log WHERE oprettet < ? GROUP BY fejl_id`
  ),
  sletStemmerFoer: db.prepare(`DELETE FROM stemmer_log WHERE oprettet < ?`),
  nedskrivStemmer: db.prepare(
    `UPDATE fejl SET stemmer = MAX(1, stemmer - @antal), opdateret = datetime('now') WHERE id = @id`
  ),

  kommentarerForFejl: db.prepare<[number], Kommentar>(
    `SELECT * FROM kommentarer WHERE fejl_id = ? ORDER BY oprettet ASC`
  ),

  antalKommForFejl: db.prepare<[number], { n: number }>(
    `SELECT COUNT(*) AS n FROM kommentarer WHERE fejl_id = ?`
  ),

  kommentarById: db.prepare<[number], Kommentar>(
    `SELECT * FROM kommentarer WHERE id = ?`
  ),

  // Saet (eller nulstil med null) hvilken kommentar der er loesningen paa en fejl.
  saetLoesning: db.prepare(
    `UPDATE fejl SET loesning_kommentar_id = @kid, opdateret = datetime('now') WHERE id = @fejlId`
  ),

  opretKommentar: db.prepare(`
    INSERT INTO kommentarer (fejl_id, navn, tekst) VALUES (@fejl_id, @navn, @tekst)
  `),

  // --- Moderation af kommentarer (admin + moderator) ---
  sletKommentarRaekke: db.prepare(`DELETE FROM kommentarer WHERE id = ?`),
  opdaterKommentar: db.prepare(
    `UPDATE kommentarer SET tekst = @tekst WHERE id = @id`
  ),
  // Hvis en slettet kommentar var markeret som løsningen, så ryd pegepinden.
  ryddLoesningHvis: db.prepare(
    `UPDATE fejl SET loesning_kommentar_id = NULL, opdateret = datetime('now') WHERE loesning_kommentar_id = ?`
  ),

  topFejl: db.prepare<[number], Fejl>(
    `SELECT * FROM fejl ORDER BY stemmer DESC, oprettet DESC LIMIT ?`
  ),

  // --- Admin-overblik ---
  hentMeta: db.prepare<[string], { vaerdi: string }>(
    `SELECT vaerdi FROM meta WHERE noegle = ?`
  ),
  saetMetaNu: db.prepare(
    `INSERT INTO meta (noegle, vaerdi) VALUES (?, datetime('now'))
     ON CONFLICT(noegle) DO UPDATE SET vaerdi = datetime('now')`
  ),
  saetMeta: db.prepare(
    `INSERT INTO meta (noegle, vaerdi) VALUES (@noegle, @vaerdi)
     ON CONFLICT(noegle) DO UPDATE SET vaerdi = @vaerdi`
  ),
  // "Siden sidste rapport" (kun fejl): antal helt nye (aldrig sendt), antal der er
  // eskaleret (flere stemmer end sidst sendt), og samlet stemme-tilvaekst siden sidst.
  sidenSidstStats: db.prepare<[], { nye: number; eskaleret: number; ekstra_stemmer: number }>(`
    SELECT
      COALESCE(SUM(CASE WHEN sidst_sendt_dato IS NULL THEN 1 ELSE 0 END), 0) AS nye,
      COALESCE(SUM(CASE WHEN sidst_sendt_dato IS NOT NULL AND stemmer > COALESCE(sidst_sendt_stemmer, 0) THEN 1 ELSE 0 END), 0) AS eskaleret,
      COALESCE(SUM(MAX(0, stemmer - COALESCE(sidst_sendt_stemmer, 0))), 0) AS ekstra_stemmer
    FROM fejl
    WHERE type = 'fejl'
  `),
  // Forside-tal (kun fejl): meldinger, bekraeftede (>= taerskel biler), sendt, loest.
  forsideStats: db.prepare<[{ taerskel: number }], { meldinger: number; bekraeftet: number; sendt: number; loest: number }>(`
    SELECT
      COUNT(*) AS meldinger,
      COALESCE(SUM(CASE WHEN (SELECT COUNT(*) FROM stemmer_log sl WHERE sl.fejl_id = f.id AND sl.ejer_variant IS NOT NULL) >= @taerskel THEN 1 ELSE 0 END), 0) AS bekraeftet,
      COALESCE(SUM(CASE WHEN sidst_sendt_dato IS NOT NULL THEN 1 ELSE 0 END), 0) AS sendt,
      COALESCE(SUM(CASE WHEN loest_dato IS NOT NULL THEN 1 ELSE 0 END), 0) AS loest
    FROM fejl f
    WHERE f.type = 'fejl'
  `),
  antalFejl: db.prepare<[], { n: number }>(`SELECT COUNT(*) AS n FROM fejl`),
  antalKommentarer: db.prepare<[], { n: number }>(`SELECT COUNT(*) AS n FROM kommentarer`),
  antalFejlSiden: db.prepare<[string | null], { n: number }>(
    `SELECT COUNT(*) AS n FROM fejl WHERE oprettet > ?`
  ),
  antalKommentarerSiden: db.prepare<[string | null], { n: number }>(
    `SELECT COUNT(*) AS n FROM kommentarer WHERE oprettet > ?`
  ),
  senesteFejl: db.prepare<[number], { id: number; titel: string; oprettet: string }>(
    `SELECT id, titel, oprettet FROM fejl ORDER BY oprettet DESC LIMIT ?`
  ),
  senesteKommentarer: db.prepare<
    [number],
    { id: number; fejl_id: number; navn: string; tekst: string; oprettet: string; fejl_titel: string }
  >(`
    SELECT k.id, k.fejl_id, k.navn, k.tekst, k.oprettet, f.titel AS fejl_titel
    FROM kommentarer k JOIN fejl f ON f.id = k.fejl_id
    ORDER BY k.oprettet DESC LIMIT ?
  `),

  // Al aktivitet (stemmer + kommentarer + nye fejl) siden et tidspunkt, til statistik.
  // Tidsstempler er UTC; bucketing til dansk tid sker i statistik-siden.
  aktivitetSiden: db.prepare<[string, string, string], { oprettet: string; slags: string }>(`
    SELECT oprettet, 'stemme'    AS slags FROM stemmer_log WHERE oprettet >= ?
    UNION ALL
    SELECT oprettet, 'kommentar' AS slags FROM kommentarer  WHERE oprettet >= ?
    UNION ALL
    SELECT oprettet, 'fejl'      AS slags FROM fejl          WHERE oprettet >= ?
  `),

  // --- Henvendelser (kontaktformular) ---
  opretHenvendelse: db.prepare(
    `INSERT INTO henvendelser (navn, email, besked) VALUES (@navn, @email, @besked)`
  ),
  senesteHenvendelser: db.prepare<[number], Henvendelse>(
    `SELECT * FROM henvendelser ORDER BY oprettet DESC LIMIT ?`
  ),
  antalHenvendelser: db.prepare<[], { n: number }>(`SELECT COUNT(*) AS n FROM henvendelser`),
  antalHenvendelserSiden: db.prepare<[string | null], { n: number }>(
    `SELECT COUNT(*) AS n FROM henvendelser WHERE oprettet > ?`
  ),
  sletHenvendelse: db.prepare(`DELETE FROM henvendelser WHERE id = ?`),

  // --- Admin-adgange ---
  opretAdgang: db.prepare(
    `INSERT INTO admin_adgange (navn, rolle, kode_hash) VALUES (@navn, @rolle, @kode_hash)`
  ),
  alleAdgange: db.prepare<[], AdminAdgang>(
    `SELECT * FROM admin_adgange ORDER BY oprettet DESC`
  ),
  findAktivAdgang: db.prepare<[string], AdminAdgang>(
    `SELECT * FROM admin_adgange WHERE kode_hash = ? AND aktiv = 1`
  ),
  findAdgangVedHash: db.prepare<[string], AdminAdgang>(
    `SELECT * FROM admin_adgange WHERE kode_hash = ?`
  ),
  saetAdgangAktiv: db.prepare(
    `UPDATE admin_adgange SET aktiv = @aktiv WHERE id = @id`
  ),
  sletAdgang: db.prepare(`DELETE FROM admin_adgange WHERE id = ?`),
  opdaterAdgangBrugt: db.prepare(
    `UPDATE admin_adgange SET sidst_brugt = datetime('now') WHERE id = ?`
  ),

  // --- Invitationer ---
  opretInvitation: db.prepare(
    `INSERT INTO admin_invitationer (navn, rolle, token, nulstil_adgang_id)
     VALUES (@navn, @rolle, @token, @nulstil_adgang_id)`
  ),
  adgangById: db.prepare<[number], AdminAdgang>(`SELECT * FROM admin_adgange WHERE id = ?`),
  opdaterAdgangKode: db.prepare(
    `UPDATE admin_adgange SET kode_hash = @kode_hash, aktiv = 1 WHERE id = @id`
  ),
  alleInvitationer: db.prepare<[], AdminInvitation>(
    `SELECT * FROM admin_invitationer ORDER BY oprettet DESC`
  ),
  findAabenInvitation: db.prepare<[string], AdminInvitation>(
    `SELECT * FROM admin_invitationer WHERE token = ? AND brugt = 0`
  ),
  brugInvitation: db.prepare(`UPDATE admin_invitationer SET brugt = 1 WHERE id = ?`),
  sletInvitation: db.prepare(`DELETE FROM admin_invitationer WHERE id = ?`),

  // --- Rapport-log (revision) ---
  opretRapportLog: db.prepare(`
    INSERT INTO rapport_log (navn, rolle, format, type, antal, kun_aendrede, med_kommentarer)
    VALUES (@navn, @rolle, @format, @type, @antal, @kun_aendrede, @med_kommentarer)
  `),
  senesteRapportLog: db.prepare<[number], RapportLog>(
    `SELECT * FROM rapport_log ORDER BY oprettet DESC LIMIT ?`
  ),

  // --- Notifikations-tilmeldinger (følg en tråd) ---
  // Opret en tilmelding (ubekraeftet). Dubletter (samme email+fejl) afvises af
  // UNIQUE-constraint; kaldersiden fanger det og gen-sender bare bekræft-mailen.
  opretTilmelding: db.prepare(
    `INSERT INTO notifikation_tilmelding (fejl_id, email, token) VALUES (@fejl_id, @email, @token)`
  ),
  findTilmelding: db.prepare<[number, string], NotifikationTilmelding>(
    `SELECT * FROM notifikation_tilmelding WHERE fejl_id = ? AND email = ?`
  ),
  findTilmeldingVedToken: db.prepare<[string], NotifikationTilmelding>(
    `SELECT * FROM notifikation_tilmelding WHERE token = ?`
  ),
  bekraeftTilmelding: db.prepare(
    `UPDATE notifikation_tilmelding SET bekraeftet = 1 WHERE token = ?`
  ),
  nytTokenPaaTilmelding: db.prepare(
    `UPDATE notifikation_tilmelding SET token = @token, bekraeftet = 0 WHERE id = @id`
  ),
  sletTilmelding: db.prepare(`DELETE FROM notifikation_tilmelding WHERE token = ?`),
  // Alle bekraeftede følgere af en tråd — modtagerne af en notifikation.
  foelgereForFejl: db.prepare<[number], { email: string; token: string }>(
    `SELECT email, token FROM notifikation_tilmelding WHERE fejl_id = ? AND bekraeftet = 1`
  ),
  antalFoelgereForFejl: db.prepare<[number], { n: number }>(
    `SELECT COUNT(*) AS n FROM notifikation_tilmelding WHERE fejl_id = ? AND bekraeftet = 1`
  ),

  // --- Notifikations-kø (outbox) ---
  koeMail: db.prepare(
    `INSERT INTO notifikation_koe (email, emne, html) VALUES (@email, @emne, @html)`
  ),
  usendteMails: db.prepare<[number], KoeMail>(
    `SELECT * FROM notifikation_koe WHERE sendt IS NULL ORDER BY oprettet ASC LIMIT ?`
  ),
  markerMailSendt: db.prepare(
    `UPDATE notifikation_koe SET sendt = datetime('now') WHERE id = ?`
  ),
  antalUsendte: db.prepare<[], { n: number }>(
    `SELECT COUNT(*) AS n FROM notifikation_koe WHERE sendt IS NULL`
  ),

  // --- Oversaettelses-cache ---
  hentOversaettelse: db.prepare<[number, string], Oversaettelse>(
    `SELECT * FROM oversaettelser WHERE fejl_id = ? AND sprog = ?`
  ),

  gemOversaettelse: db.prepare(`
    INSERT INTO oversaettelser (fejl_id, sprog, kilde_hash, titel, beskrivelse)
    VALUES (@fejl_id, @sprog, @kilde_hash, @titel, @beskrivelse)
    ON CONFLICT(fejl_id, sprog) DO UPDATE SET
      kilde_hash  = excluded.kilde_hash,
      titel       = excluded.titel,
      beskrivelse = excluded.beskrivelse,
      oprettet    = datetime('now')
  `),
};

// Oprydning: sletter alle stemmer foer et tidspunkt OG retter stemmetallet pr. fejl
// i én atomar handling. Returnerer antal slettede stemmer.
export const rydStemmerFoer = db.transaction((cutoff: string): number => {
  const perFejl = queries.stemmerFoerPerFejl.all(cutoff);
  const info = queries.sletStemmerFoer.run(cutoff);
  for (const r of perFejl) queries.nedskrivStemmer.run({ id: r.fejl_id, antal: r.n });
  return Number(info.changes);
});

// Slet en kommentar og ryd samtidig en evt. "løsning"-pegepind, der peger paa den.
// Returnerer antal slettede (0 hvis kommentaren ikke fandtes). Atomar.
export const fjernKommentar = db.transaction((id: number): number => {
  queries.ryddLoesningHvis.run(id);
  return Number(queries.sletKommentarRaekke.run(id).changes);
});

// Stemme-transaktion: tjekker dublet, logger og taeller op i én atomar handling.
export const afgivStemme = db.transaction((fejlId: number, token: string): boolean => {
  const { n } = queries.harStemt.get(fejlId, token)!;
  if (n > 0) return false; // har allerede stemt
  queries.logStemme.run(fejlId, token);
  queries.taelStemmeOp.run(fejlId);
  return true;
});

// "Dan Zeekr-rapport": markér et udvalg af fejl som sendt nu, OG gem et snapshot af
// deres forrige sidst_sendt-vaerdier, saa markeringen kan fortrydes i ét hug.
// Returnerer antal markerede. Atomar.
export const danRapportMarkering = db.transaction(
  (
    fejl: { id: number; sidst_sendt_stemmer: number | null; sidst_sendt_dato: string | null }[],
    navn: string,
    rolle: string
  ): number => {
    const data = JSON.stringify(
      fejl.map((f) => ({ id: f.id, ps: f.sidst_sendt_stemmer, pd: f.sidst_sendt_dato }))
    );
    for (const f of fejl) queries.markerSendt.run(f.id);
    queries.opretMarkering.run({ navn, rolle, antal: fejl.length, data });
    return fejl.length;
  }
);

// Fortryd den seneste (ikke-fortrudte) markering: rul hver ramt fejls sidst_sendt
// tilbage til snapshot'et. Returnerer antal gendannede, eller null hvis intet at fortryde.
export const fortrydSidsteMarkering = db.transaction((): { antal: number; oprettet: string } | null => {
  const sidste = queries.sidsteMarkering.get();
  if (!sidste) return null;
  const snapshot = JSON.parse(sidste.data) as { id: number; ps: number | null; pd: string | null }[];
  for (const r of snapshot) queries.gendanSidstSendt.run({ id: r.id, stemmer: r.ps, dato: r.pd });
  queries.markerMarkeringFortrudt.run(sidste.id);
  return { antal: snapshot.length, oprettet: sidste.oprettet };
});
