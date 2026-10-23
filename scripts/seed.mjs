// Seeder databasen med eksempel-bugherrer, så siden ikke er tom første gang.
// Køres automatisk i Docker ved opstart HVIS databasen er tom (se docker-entrypoint.sh),
// eller manuelt med: npm run seed
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
if (antal > 0) {
  console.log(`Databasen har allerede ${antal} bygherrer — springer seed over.`);
  process.exit(0);
}

const fejl = [
  {
    titel: 'Opladning stopper ved 80% uden grund',
    bilmodel: 'Zeekr 7GT',
    softwareversion: 'OS 1.3.0',
    beskrivelse:
      'Bilen afbryder opladningen ved 80% selv om grænsen er sat til 100% i menuen. Sker kun på AC-ladere, ikke på lynladere. Ingen fejlmeddelelse på skærmen.',
    status: 'Bekræftet',
    stemmer: 47,
  },
  {
    titel: 'Bagagerum (el-bagklap) lukker af sig selv igen',
    bilmodel: 'Zeekr 7GT',
    softwareversion: 'OS 1.3.1',
    beskrivelse:
      'Når man åbner bagklappen via knappen, kører den halvt op og lukker så igen. Skal trykkes 2-3 gange. Virker igen efter en skærm-genstart, men kommer tilbage.',
    status: 'Undersøges',
    stemmer: 31,
  },
  {
    titel: 'CarPlay afbryder ved hvert vejsving',
    bilmodel: 'Zeekr 7GT',
    softwareversion: 'OS 1.2.9',
    beskrivelse:
      'Trådløs CarPlay mister forbindelsen hver gang bilen drejer skarpt. Lyden hakker og navigationen fryser i 2-3 sekunder. Kablet CarPlay har ikke problemet.',
    status: 'Sendt til Zeekr',
    stemmer: 58,
  },
  {
    titel: 'Klimaanlæg glemmer indstilling efter parkering',
    bilmodel: 'Zeekr 7GT',
    softwareversion: 'OS 1.3.0',
    beskrivelse:
      'Hver gang bilen har stået parkeret natten over, er klimaet nulstillet til 22 grader og auto-blæser, selv om man har sat sine egne værdier.',
    status: 'Undersøges',
    stemmer: 19,
  },
  {
    titel: 'Fartpilot-ikon forsvinder fra skærmen',
    bilmodel: 'Zeekr 7GT',
    softwareversion: 'OS 1.2.8',
    beskrivelse:
      'Adaptiv fartpilot virker fint, men selve ikonet/statusvisningen forsvinder fra instrumentpanelet, så man ikke kan se den indstillede hastighed. Kommer tilbage ved genstart.',
    status: 'Løst!',
    stemmer: 24,
  },
  {
    titel: 'Stemmestyring forstår ikke dansk',
    bilmodel: 'Zeekr 7GT',
    softwareversion: 'OS 1.2.9',
    beskrivelse:
      'Stemmeassistenten er sat til dansk i menuen, men svarer på engelsk og misforstår næsten alle kommandoer. "Ring til mor" bliver til en websøgning.',
    status: 'Bekræftet',
    stemmer: 42,
  },
  {
    titel: 'Baksensor bipper ved ingenting',
    bilmodel: 'Zeekr 7GT',
    softwareversion: 'OS 1.3.0',
    beskrivelse:
      'Parkeringssensorerne bagtil giver alarm selv på en helt tom p-plads. Bippet er konstant under bakning. Fysisk rengøring af sensorerne hjalp ikke.',
    status: 'Undersøges',
    stemmer: 13,
  },
  {
    titel: 'Navigation sender til forkert adresse-nummer',
    bilmodel: 'Zeekr 7GT',
    softwareversion: 'OS 1.3.1',
    beskrivelse:
      'Indbygget navigation lander konsekvent på det modsatte husnummer på lige/ulige side af vejen. Sker specielt i mindre byer.',
    status: 'Undersøges',
    stemmer: 8,
  },
];

const insertFejl = db.prepare(`
  INSERT INTO fejl (titel, bilmodel, softwareversion, beskrivelse, status, stemmer, oprettet)
  VALUES (@titel, @bilmodel, @softwareversion, @beskrivelse, @status, @stemmer, datetime('now', @alder))
`);

const insertKommentar = db.prepare(`
  INSERT INTO kommentarer (fejl_id, navn, tekst) VALUES (?, ?, ?)
`);

const tx = db.transaction(() => {
  fejl.forEach((f, i) => {
    // Spred oprettelsestidspunkterne ud, saa "Nyeste"-sortering giver mening.
    const alder = `-${(fejl.length - i) * 2} days`;
    const info = insertFejl.run({ ...f, alder });
    const id = info.lastInsertRowid;

    // Et par eksempel-kommentarer på de mest aktive.
    if (i === 0) {
      insertKommentar.run(id, 'LadeLars', 'Oplever præcis det samme på min 7GT. Kun på min hjemmelader.');
      insertKommentar.run(id, 'Anonym bygmester', 'Prøv at sætte grænsen til 90% og tilbage til 100% — virkede for mig som midlertidig fix.');
    }
    if (i === 2) {
      insertKommentar.run(id, 'CarPlay-Camilla', 'Bekræftet på min 7GT. Super irriterende i rundkørsler.');
    }
    if (i === 4) {
      insertKommentar.run(id, 'Admin', 'Dette er rettet i OS 1.3.2 — husk at opdatere!');
    }
  });
});

tx();

const nu = db.prepare('SELECT COUNT(*) AS n FROM fejl').get().n;
console.log(`Seedede ${nu} bygherrer ✅`);
db.close();
