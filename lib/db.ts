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

    CREATE INDEX IF NOT EXISTS idx_fejl_stemmer ON fejl(stemmer DESC);
    CREATE INDEX IF NOT EXISTS idx_fejl_oprettet ON fejl(oprettet DESC);
    CREATE INDEX IF NOT EXISTS idx_kommentar_fejl ON kommentarer(fejl_id);
  `);
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
}

export interface Kommentar {
  id: number;
  fejl_id: number;
  navn: string;
  tekst: string;
  oprettet: string;
}

// --- Forespoergsler ---
export const queries = {
  alleFejl: db.prepare<[], Fejl>(`SELECT * FROM fejl ORDER BY stemmer DESC, oprettet DESC`),

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

  opretKommentar: db.prepare(`
    INSERT INTO kommentarer (fejl_id, navn, tekst) VALUES (@fejl_id, @navn, @tekst)
  `),

  topFejl: db.prepare<[number], Fejl>(
    `SELECT * FROM fejl ORDER BY stemmer DESC, oprettet DESC LIMIT ?`
  ),
};

// Stemme-transaktion: tjekker dublet, logger og taeller op i én atomar handling.
export const afgivStemme = db.transaction((fejlId: number, token: string): boolean => {
  const { n } = queries.harStemt.get(fejlId, token)!;
  if (n > 0) return false; // har allerede stemt
  queries.logStemme.run(fejlId, token);
  queries.taelStemmeOp.run(fejlId);
  return true;
});
