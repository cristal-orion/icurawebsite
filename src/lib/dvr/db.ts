// Database dell'area analizzatore DVR: SQLite nativo di Node (node:sqlite, nessuna
// dipendenza da compilare). Un solo file, percorso da DVR_DB_PATH:
//   - in locale: ./data/icura.db (cartella in .gitignore)
//   - nel container: /data/icura.db → su Coolify /data va montato come volume persistente,
//     altrimenti a ogni deploy si perdono gli utenti.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH = resolve(process.env.DVR_DB_PATH || "data/icura.db");

// Migrazioni in ordine: la posizione nell'array è la versione (PRAGMA user_version).
// Mai modificare una migrazione già andata in produzione: se ne aggiunge una nuova in fondo.
const MIGRAZIONI = [
  `
  CREATE TABLE utenti (
    id                  INTEGER PRIMARY KEY,
    email               TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    nome                TEXT    NOT NULL,
    azienda             TEXT    NOT NULL,
    dipendenti          INTEGER NOT NULL,
    anni_attivita       INTEGER NOT NULL,
    password_hash       TEXT    NOT NULL,
    consenso_privacy_at TEXT    NOT NULL,
    consenso_marketing  INTEGER NOT NULL DEFAULT 0,
    creato_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    ultimo_accesso_at   TEXT
  );

  CREATE TABLE sessioni (
    token_hash TEXT    PRIMARY KEY,
    utente_id  INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    creata_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    scade_at   TEXT    NOT NULL
  );
  CREATE INDEX sessioni_utente ON sessioni(utente_id);

  -- Ogni apertura dell'analizzatore dall'area: serve a iCura per sapere chi lo usa davvero.
  CREATE TABLE aperture_analizzatore (
    id        INTEGER PRIMARY KEY,
    utente_id INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX aperture_utente ON aperture_analizzatore(utente_id);
  `,
];

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

  const { user_version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = user_version; v < MIGRAZIONI.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRAZIONI[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  // Pulizia sessioni scadute all'avvio: poche righe, nessun job da schedulare.
  db.prepare("DELETE FROM sessioni WHERE scade_at < datetime('now')").run();
  return db;
}

export interface Utente {
  id: number;
  email: string;
  nome: string;
  azienda: string;
  dipendenti: number;
  anni_attivita: number;
}
