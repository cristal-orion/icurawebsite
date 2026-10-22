// Catalogo "Acquista online": offerte a prezzo chiaro (corsi, consulenze, documenti).
// I testi arrivano dal sito del cliente (new.icuraimpresa.it/acquista) e stanno in
// acquista.json. Niente pagamento online: "Acquista" invia una richiesta d'ordine
// (Klaviyo, come gli altri form) e il pagamento si concorda dopo.
import raw from "./acquista.json";

export type Tipo = "corso_calendario" | "corso_azienda" | "consulenza" | "servizio";

export interface Offerta {
  slug: string;
  tipo: Tipo;
  titolo: string;
  lede: string;
  prezzo: number;
  listino: number;
  iva: number;
  unita: string;
  perChi: string;
  quando: string;
  problema: string;
  ricevi: string[];
  passi: string[];
  dettagli: { k: string; v: string }[];
  incluso: string[];
  escluso: string[];
  chiEroga: string;
  dopo: string[];
  faq: { q: string; a: string }[];
}

export const offerte = raw as Offerta[];

export const tipi: Record<Tipo, { label: string; plurale: string }> = {
  corso_calendario: { label: "Corso a calendario", plurale: "Corsi a calendario" },
  corso_azienda: { label: "Corso in azienda", plurale: "Corsi in azienda" },
  consulenza: { label: "Consulenza", plurale: "Consulenze prenotabili" },
  servizio: { label: "Servizio a prezzo fisso", plurale: "Servizi a prezzo fisso" },
};

const fmt = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const euro = (n: number) => fmt.format(n);
export const conIva = (n: number, iva = 22) => Math.round(n * (100 + iva)) / 100;

// ── Come si organizza il catalogo ────────────────────────────────────────────
// Due assi di filtro: il gruppo (che cosa compri) e l'argomento (per che cosa).
// Il JSON del cliente non li ha: si ricavano qui, così nuove offerte finiscono
// da sole nel posto giusto (l'argomento si legge dallo slug).
export type Gruppo = "corsi" | "consulenze" | "servizi";
export type Area = "sicurezza" | "alimentare" | "privacy" | "agevolazioni";

export const gruppi: Record<Gruppo, { label: string; desc: string; tipi: Tipo[] }> = {
  corsi: {
    label: "Corsi",
    desc: "Con attestato: a calendario a Napoli o in videoconferenza, oppure in azienda.",
    tipi: ["corso_calendario", "corso_azienda"],
  },
  consulenze: {
    label: "Consulenze",
    desc: "Un tecnico in videochiamata: domande concrete e un riepilogo scritto.",
    tipi: ["consulenza"],
  },
  servizi: {
    label: "Servizi a prezzo fisso",
    desc: "Perimetro chiaro: invii il brief, ricevi il documento o la pratica.",
    tipi: ["servizio"],
  },
};

export const aree: Record<Area, { label: string }> = {
  sicurezza: { label: "Sicurezza sul lavoro" },
  alimentare: { label: "Alimentare · HACCP" },
  privacy: { label: "Privacy e GDPR" },
  agevolazioni: { label: "Agevolazioni e fondi" },
};

export const gruppoDi = (t: Tipo): Gruppo =>
  (Object.keys(gruppi) as Gruppo[]).find((g) => gruppi[g].tipi.includes(t))!;

export const areaOf = (o: Offerta): Area =>
  /privacy|trattament/.test(o.slug) ? "privacy"
  : /haccp/.test(o.slug) ? "alimentare"
  : /finanza|fondi/.test(o.slug) ? "agevolazioni"
  : "sicurezza";

// Ordine di lettura dentro ogni gruppo: prima l'argomento, poi i temi vicini
// (un corso e il suo aggiornamento stanno accanto). Le offerte nuove vanno in fondo.
const ORDINE = [
  "corso-lavoratori-generale-4h", "corso-lavoratori-specifica-basso-4h", "corso-aggiornamento-lavoratori-6h",
  "corso-antincendio-livello-1", "corso-aggiornamento-antincendio-2h",
  "corso-primo-soccorso-b-c-12h", "corso-aggiornamento-primo-soccorso-4h", "corso-in-azienda-mezza-giornata",
  "corso-haccp-alimentarista-8h", "formazione-privacy-2h",
  "consulenza-sicurezza-60", "consulenza-finanza-45", "consulenza-fondi-45",
  "dvr-nuovo", "revisione-dvr", "duvri", "nomine-sicurezza", "pos-cantiere", "checkup-documentale-sicurezza",
  "manuale-haccp", "aggiornamento-manuale-haccp",
  "informative-privacy", "registro-trattamenti", "nomine-privacy",
];
const posto = (o: Offerta) => {
  const i = ORDINE.indexOf(o.slug);
  return i === -1 ? ORDINE.length + offerte.indexOf(o) : i;
};

export const catalogo = (Object.keys(gruppi) as Gruppo[]).map((id) => ({
  id,
  ...gruppi[id],
  offerte: offerte.filter((o) => gruppoDi(o.tipo) === id).sort((a, b) => posto(a) - posto(b)),
}));

// Due informazioni brevi per la card: durata e modalità, oppure modalità e tempi di consegna.
const dettaglio = (o: Offerta, k: string) => o.dettagli.find((d) => d.k === k)?.v;
const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function meta(o: Offerta): string[] {
  const durata = dettaglio(o, "Durata")?.replace(/^1 ore\b/, "1 ora");
  const modalita = dettaglio(o, "Modalità");
  const consegna = dettaglio(o, "Tempi")?.match(/entro (\d+ giorni lavorativi)/)?.[1];
  return [
    durata ? maiuscola(durata) : consegna ? `Consegna in ${consegna}` : "",
    modalita ? maiuscola(modalita) : "",
  ].filter(Boolean);
}
