// Opretter databasens skema på en frisk volume. INGEN eksempeldata længere —
// rigtige bugherrer meldes ind af ejerne selv (så stemmetal og indhold er ægte).
// Køres automatisk i Docker ved første opstart (se docker-entrypoint.sh).
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bygherrer.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS fejl (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titel TEXT NOT NULL, bilmodel TEXT NOT NULL, softwareversion TEXT NOT NULL,
    beskrivelse TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Undersøges',
    stemmer INTEGER NOT NULL DEFAULT 1,
    oprettet TEXT NOT NULL DEFAULT (datetime('now')),
    opdateret TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS kommentarer (
    id INTEGER PRIMARY KEY AUTOINCREMENT, fejl_id INTEGER NOT NULL,
    navn TEXT NOT NULL DEFAULT 'Anonym bygmester', tekst TEXT NOT NULL,
    oprettet TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (fejl_id) REFERENCES fejl(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS stemmer_log (
    fejl_id INTEGER NOT NULL, token TEXT NOT NULL,
    oprettet TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (fejl_id, token),
    FOREIGN KEY (fejl_id) REFERENCES fejl(id) ON DELETE CASCADE
  );
`);

const antal = db.prepare('SELECT COUNT(*) AS n FROM fejl').get().n;
console.log(
  antal > 0
    ? `Databasen har allerede ${antal} bugherrer — intet at gøre.`
    : 'Skema klar. Ingen eksempeldata — rigtige bugherrer meldes ind af ejerne selv. ✅'
);
db.close();
process.exit(0);
