// Registrazione, accesso e sessioni dell'area analizzatore DVR.
// Password con scrypt (node:crypto), sessione = token casuale in un cookie httpOnly;
// nel database c'è solo l'hash SHA-256 del token, mai il token.
import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { AstroCookies } from "astro";
import { getDb, type Utente } from "./db";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const COOKIE = "icura_dvr";
const DURATA_GIORNI = 30;

export const URL_ANALIZZATORE =
  process.env.DVR_TOOL_URL || "https://app.affinitylab.it:8447/verifica";

// ── Password ────────────────────────────────────────────────────
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function verificaPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const atteso = Buffer.from(keyB64, "base64");
  const key = await scrypt(pw, Buffer.from(saltB64, "base64"), atteso.length);
  return timingSafeEqual(key, atteso);
}

// Hash fittizio: se l'email non esiste si fa comunque uno scrypt, così il tempo di
// risposta non rivela quali email sono registrate.
const HASH_FINTO = `scrypt$${randomBytes(16).toString("base64")}$${randomBytes(64).toString("base64")}`;

// ── Sessioni ────────────────────────────────────────────────────
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function apriSessione(utenteId: number, cookies: AstroCookies, request: Request) {
  const token = randomBytes(32).toString("base64url");
  getDb()
    .prepare(`INSERT INTO sessioni (token_hash, utente_id, scade_at) VALUES (?, ?, datetime('now', ?))`)
    .run(sha256(token), utenteId, `+${DURATA_GIORNI} days`);
  getDb().prepare(`UPDATE utenti SET ultimo_accesso_at = datetime('now') WHERE id = ?`).run(utenteId);
  cookies.set(COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    maxAge: DURATA_GIORNI * 24 * 60 * 60,
  });
}

export function utenteCorrente(cookies: AstroCookies): Utente | null {
  const token = cookies.get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.nome, u.azienda, u.dipendenti, u.anni_attivita
         FROM sessioni s JOIN utenti u ON u.id = s.utente_id
        WHERE s.token_hash = ? AND s.scade_at > datetime('now')`,
    )
    .get(sha256(token)) as Utente | undefined;
  return row ?? null;
}

export function chiudiSessione(cookies: AstroCookies) {
  const token = cookies.get(COOKIE)?.value;
  if (token) getDb().prepare(`DELETE FROM sessioni WHERE token_hash = ?`).run(sha256(token));
  cookies.delete(COOKIE, { path: "/" });
}

// ── Richiesta ───────────────────────────────────────────────────
function isHttps(request: Request) {
  return (
    request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:"
  );
}

/** I POST devono arrivare da una pagina del sito stesso (difesa CSRF insieme a SameSite=Lax). */
export function stessaOrigine(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // browser vecchi non lo mandano sempre sui form
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function ipDi(request: Request, clientAddress?: string) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || clientAddress || "?";
}

// Limite tentativi in memoria: basta per un solo processo; si azzera a ogni riavvio.
const tentativi = new Map<string, { n: number; fino: number }>();
export function troppiTentativi(chiave: string, max: number, minuti: number): boolean {
  const ora = Date.now();
  const t = tentativi.get(chiave);
  if (!t || t.fino < ora) {
    tentativi.set(chiave, { n: 1, fino: ora + minuti * 60_000 });
    return false;
  }
  t.n++;
  return t.n > max;
}

// ── Registrazione ───────────────────────────────────────────────
export interface DatiRegistrazione {
  nome: string;
  email: string;
  azienda: string;
  dipendenti: string;
  anni_attivita: string;
  password: string;
  privacy: boolean;
  marketing: boolean;
}

export type Errori = Partial<Record<keyof DatiRegistrazione | "form", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function intero(s: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(s.trim())) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

export async function registra(
  d: DatiRegistrazione,
  cookies: AstroCookies,
  request: Request,
): Promise<Errori | null> {
  const e: Errori = {};
  const nome = d.nome.trim();
  const email = d.email.trim().toLowerCase();
  const azienda = d.azienda.trim();
  const dipendenti = intero(d.dipendenti, 0, 100_000);
  const anni = intero(d.anni_attivita, 0, 200);

  if (nome.length < 2 || nome.length > 120) e.nome = "Scrivi nome e cognome.";
  if (!EMAIL_RE.test(email) || email.length > 254) e.email = "Controlla l'indirizzo email.";
  if (azienda.length < 2 || azienda.length > 160) e.azienda = "Scrivi il nome dell'azienda.";
  if (dipendenti === null) e.dipendenti = "Indica un numero (0 se sei titolare senza dipendenti).";
  if (anni === null) e.anni_attivita = "Indica gli anni di attività (0 se hai aperto quest'anno).";
  if (d.password.length < 10) e.password = "Almeno 10 caratteri.";
  else if (d.password.length > 200) e.password = "Al massimo 200 caratteri.";
  if (!d.privacy) e.privacy = "Per registrarti serve il consenso all'informativa.";
  if (Object.keys(e).length) return e;

  const db = getDb();
  const esiste = db.prepare(`SELECT 1 FROM utenti WHERE email = ?`).get(email);
  if (esiste) {
    return { email: "Questa email è già registrata: accedi con la tua password." };
  }

  const hash = await hashPassword(d.password);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO utenti (email, nome, azienda, dipendenti, anni_attivita, password_hash,
                           consenso_privacy_at, consenso_marketing)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
    )
    .run(email, nome, azienda, dipendenti, anni, hash, d.marketing ? 1 : 0);

  apriSessione(Number(lastInsertRowid), cookies, request);
  return null;
}

// ── Accesso ─────────────────────────────────────────────────────
export async function accedi(
  emailIn: string,
  password: string,
  cookies: AstroCookies,
  request: Request,
): Promise<boolean> {
  const email = emailIn.trim().toLowerCase();
  const row = getDb()
    .prepare(`SELECT id, password_hash FROM utenti WHERE email = ?`)
    .get(email) as { id: number; password_hash: string } | undefined;

  const ok = await verificaPassword(password, row?.password_hash ?? HASH_FINTO);
  if (!row || !ok) return false;
  apriSessione(row.id, cookies, request);
  return true;
}

export function registraApertura(utenteId: number) {
  getDb().prepare(`INSERT INTO aperture_analizzatore (utente_id) VALUES (?)`).run(utenteId);
}
