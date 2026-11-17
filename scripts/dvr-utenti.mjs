#!/usr/bin/env node
// Gestione a mano degli iscritti all'area analizzatore DVR (dal terminale del container
// su Coolify, o in locale). Usa lo stesso database del sito (DVR_DB_PATH).
//
//   node scripts/dvr-utenti.mjs elenco
//   node scripts/dvr-utenti.mjs reset-password mario@azienda.it   → stampa una password provvisoria
//   node scripts/dvr-utenti.mjs elimina mario@azienda.it           → cancella utente, sessioni, aperture
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.env.DVR_DB_PATH || "data/icura.db");
if (!existsSync(path)) {
  console.error(`Database non trovato: ${path} (imposta DVR_DB_PATH)`);
  process.exit(1);
}
const db = new DatabaseSync(path);
db.exec("PRAGMA foreign_keys = ON");

const [cmd, email] = process.argv.slice(2);
const trova = (e) => db.prepare("SELECT id, nome, azienda FROM utenti WHERE email = ?").get(e.toLowerCase());

switch (cmd) {
  case "elenco": {
    console.table(db.prepare("SELECT id, creato_at, nome, email, azienda, dipendenti, anni_attivita FROM utenti ORDER BY id").all());
    break;
  }
  case "reset-password": {
    const u = email && trova(email);
    if (!u) { console.error("Utente non trovato."); process.exit(1); }
    const pw = randomBytes(9).toString("base64url");
    const salt = randomBytes(16);
    const hash = `scrypt$${salt.toString("base64")}$${scryptSync(pw, salt, 64).toString("base64")}`;
    db.prepare("UPDATE utenti SET password_hash = ? WHERE id = ?").run(hash, u.id);
    db.prepare("DELETE FROM sessioni WHERE utente_id = ?").run(u.id);
    console.log(`Password provvisoria per ${u.nome} (${u.azienda}): ${pw}`);
    break;
  }
  case "elimina": {
    const u = email && trova(email);
    if (!u) { console.error("Utente non trovato."); process.exit(1); }
    db.prepare("DELETE FROM utenti WHERE id = ?").run(u.id);
    console.log(`Eliminato ${u.nome} (${u.azienda}) con sessioni e aperture.`);
    break;
  }
  default:
    console.log("Comandi: elenco | reset-password <email> | elimina <email>");
}
