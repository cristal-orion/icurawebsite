// Esportazione CSV degli iscritti all'area analizzatore DVR, per iCura.
// Protetta da DVR_ADMIN_TOKEN (variabile d'ambiente): senza token configurato non esiste.
//   curl -H "Authorization: Bearer $TOKEN" https://<sito>/api/dvr/utenti.csv
// oppure dal browser: /api/dvr/utenti.csv?token=<TOKEN>
import type { APIRoute } from "astro";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@lib/dvr/db";

export const prerender = false;

function tokenValido(dato: string | null): boolean {
  const atteso = process.env.DVR_ADMIN_TOKEN;
  if (!atteso || atteso.length < 16 || !dato) return false;
  const a = Buffer.from(dato);
  const b = Buffer.from(atteso);
  return a.length === b.length && timingSafeEqual(a, b);
}

const cella = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Virgolette sempre; niente formule interpretate da Excel (=, +, -, @ in testa).
  const sicuro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${sicuro.replace(/"/g, '""')}"`;
};

export const GET: APIRoute = ({ request, url }) => {
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!tokenValido(auth ?? url.searchParams.get("token"))) {
    return new Response("Non autorizzato", { status: 401 });
  }

  const righe = getDb()
    .prepare(
      `SELECT u.id, u.creato_at, u.nome, u.email, u.azienda, u.dipendenti, u.anni_attivita,
              u.consenso_privacy_at, u.consenso_marketing, u.ultimo_accesso_at,
              (SELECT COUNT(*) FROM aperture_analizzatore a WHERE a.utente_id = u.id) AS aperture,
              (SELECT MAX(at) FROM aperture_analizzatore a WHERE a.utente_id = u.id) AS ultima_apertura
         FROM utenti u ORDER BY u.creato_at DESC`,
    )
    .all() as Record<string, unknown>[];

  const colonne = [
    "id", "creato_at", "nome", "email", "azienda", "dipendenti", "anni_attivita",
    "consenso_privacy_at", "consenso_marketing", "ultimo_accesso_at", "aperture", "ultima_apertura",
  ];
  const csv = [colonne.join(";"), ...righe.map((r) => colonne.map((c) => cella(r[c])).join(";"))].join("\r\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iscritti-analizzatore-dvr.csv"`,
      "Cache-Control": "no-store",
    },
  });
};
