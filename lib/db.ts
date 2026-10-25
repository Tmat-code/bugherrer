import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// --- Databasesti ---
// I produktion (Coolify) peger DATABASE_PATH paa en persistent volume, fx /app/data/bygherrer.db.
// Lokalt falder vi tilbage til ./data/bygherrer.db.
const DB_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bygherrer.db');

// Sikr at mappen findes (vigtigt foerste gang volumen er tom).
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

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

    CREATE INDEX IF NOT EXISTS idx_fejl_stemmer ON fejl(stemmer DESC);
    CREATE INDEX IF NOT EXISTS idx_fejl_oprettet ON fejl(oprettet DESC);
    CREATE INDEX IF NOT EXISTS idx_kommentar_fejl ON kommentarer(fejl_id);
    CREATE INDEX IF NOT EXISTS idx_kommentar_oprettet ON kommentarer(oprettet DESC);
  `);

  // Tilfoej "loesning"-kolonne til eksisterende databaser (peger paa den kommentar
  // der er markeret som loesningen). SQLite har ikke ADD COLUMN IF NOT EXISTS, saa
  // vi proever og ignorerer fejlen hvis kolonnen allerede findes.
  try {
    db.exec(`ALTER TABLE fejl ADD COLUMN loesning_kommentar_id INTEGER`);
  } catch {
    /* kolonnen findes allerede */
  }
}

// --- Typer ---
export interface Fejl {
  id: number;
  titel: string;
  bilmodel: string;
  softwareversion: string;
  beskrivelse: string;
  status: string;
  stemmer: number;
  oprettet: string;
  opdateret: string;
  loesning_kommentar_id: number | null; // kommentar markeret som loesning, eller null
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

// --- Forespoergsler ---
export const queries = {
  alleFejl: db.prepare<[], Fejl>(`SELECT * FROM fejl ORDER BY stemmer DESC, oprettet DESC`),

  // Forsiden: fejl + antal svar + seneste aktivitet (til "nyt svar" og aktivitets-sortering).
  alleFejlMedSvar: db.prepare<[], FejlMedSvar>(`
    SELECT
      f.*,
      COUNT(k.id) AS antal_kommentarer,
      CASE WHEN MAX(k.oprettet) > f.oprettet THEN MAX(k.oprettet) ELSE f.oprettet END AS sidste_aktivitet
    FROM fejl f
    LEFT JOIN kommentarer k ON k.fejl_id = f.id
    GROUP BY f.id
    ORDER BY f.stemmer DESC, f.oprettet DESC
  `),

  fejlEfterNyeste: db.prepare<[], Fejl>(`SELECT * FROM fejl ORDER BY oprettet DESC`),

  fejlById: db.prepare<[number], Fejl>(`SELECT * FROM fejl WHERE id = ?`),

  opretFejl: db.prepare(`
    INSERT INTO fejl (titel, bilmodel, softwareversion, beskrivelse)
    VALUES (@titel, @bilmodel, @softwareversion, @beskrivelse)
  `),

  opdaterStatus: db.prepare(`
    UPDATE fejl SET status = @status, opdateret = datetime('now') WHERE id = @id
  `),

  sletFejl: db.prepare(`DELETE FROM fejl WHERE id = ?`),

  harStemt: db.prepare<[number, string], { n: number }>(
    `SELECT COUNT(*) AS n FROM stemmer_log WHERE fejl_id = ? AND token = ?`
  ),

  logStemme: db.prepare(`INSERT INTO stemmer_log (fejl_id, token) VALUES (?, ?)`),

  taelStemmeOp: db.prepare(
    `UPDATE fejl SET stemmer = stemmer + 1, opdateret = datetime('now') WHERE id = ?`
  ),

  kommentarerForFejl: db.prepare<[number], Kommentar>(
    `SELECT * FROM kommentarer WHERE fejl_id = ? ORDER BY oprettet ASC`
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

// Stemme-transaktion: tjekker dublet, logger og taeller op i én atomar handling.
export const afgivStemme = db.transaction((fejlId: number, token: string): boolean => {
  const { n } = queries.harStemt.get(fejlId, token)!;
  if (n > 0) return false; // har allerede stemt
  queries.logStemme.run(fejlId, token);
  queries.taelStemmeOp.run(fejlId);
  return true;
});
