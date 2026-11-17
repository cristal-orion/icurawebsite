// "Apri l'analizzatore": solo per chi ha fatto l'accesso. Registra l'apertura e
// rimanda all'app (URL in DVR_TOOL_URL). È il punto in cui, quando l'app si sposta
// sul server di iCura, si potrà passare un token firmato invece del semplice redirect.
import type { APIRoute } from "astro";
import { URL_ANALIZZATORE, registraApertura, utenteCorrente } from "@lib/dvr/auth";

export const prerender = false;

export const GET: APIRoute = ({ cookies, redirect }) => {
  const utente = utenteCorrente(cookies);
  if (!utente) return redirect("/analizzatore-dvr/accedi/", 303);
  registraApertura(utente.id);
  return redirect(URL_ANALIZZATORE, 303);
};
