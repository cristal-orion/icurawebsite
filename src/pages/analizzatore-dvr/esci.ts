// Esci dall'area: chiude la sessione e torna alla landing.
import type { APIRoute } from "astro";
import { chiudiSessione, stessaOrigine } from "@lib/dvr/auth";

export const prerender = false;

export const POST: APIRoute = ({ request, cookies, redirect }) => {
  if (!stessaOrigine(request)) return new Response("Richiesta non valida", { status: 403 });
  chiudiSessione(cookies);
  return redirect("/analizzatore-dvr/", 303);
};
