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

// "1.450 €" e non "1450,00 €": separatore delle migliaia sempre, decimali solo se servono.
const fmt = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", useGrouping: "always" } as Intl.NumberFormatOptions);
const fmtTondo = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", useGrouping: "always", maximumFractionDigits: 0 } as Intl.NumberFormatOptions);
export const euro = (n: number) => (Number.isInteger(n) ? fmtTondo : fmt).format(n);
export const conIva = (n: number, iva = 22) => Math.round(n * (100 + iva)) / 100;

// ── Come si organizza il catalogo ────────────────────────────────────────────
// Cinque reparti, pensati come li cerca chi compra ("mi serve il DVR", "devo fare
// l'HACCP"), non per tipo tecnico. Il JSON del cliente non li ha: si ricavano da
// tipo e slug, così le offerte nuove finiscono da sole nel reparto giusto.
export type Categoria = "formazione" | "documenti" | "haccp" | "privacy" | "consulenze";
export type IconaShop = "formazione" | "sicurezza" | "haccp" | "privacy" | "consulenza";

export const categorie: Record<Categoria, { label: string; breve: string; desc: string; icona: IconaShop }> = {
  formazione: {
    label: "Corsi sicurezza",
    breve: "Corsi",
    desc: "Lavoratori, antincendio, primo soccorso: in aula a Napoli, in videoconferenza o direttamente in azienda. Con attestato.",
    icona: "formazione",
  },
  documenti: {
    label: "Documenti sicurezza",
    breve: "Documenti",
    desc: "DVR, DUVRI, POS e nomine a prezzo fisso: invii il brief, ricevi il documento pronto entro la data indicata.",
    icona: "sicurezza",
  },
  haccp: {
    label: "Alimentare · HACCP",
    breve: "HACCP",
    desc: "Il corso per gli alimentaristi e il manuale di autocontrollo, nuovo o da aggiornare.",
    icona: "haccp",
  },
  privacy: {
    label: "Privacy e GDPR",
    breve: "Privacy",
    desc: "Informative, registro dei trattamenti, nomine e formazione del personale.",
    icona: "privacy",
  },
  consulenze: {
    label: "Consulenze in videochiamata",
    breve: "Consulenze",
    desc: "Un tecnico per 45–60 minuti su sicurezza, agevolazioni o fondi per la formazione, con un riepilogo scritto.",
    icona: "consulenza",
  },
};

export const categoriaDi = (o: Offerta): Categoria =>
  o.tipo === "consulenza" ? "consulenze"
  : /haccp/.test(o.slug) ? "haccp"
  : /privacy|trattament/.test(o.slug) ? "privacy"
  : o.tipo === "corso_calendario" || o.tipo === "corso_azienda" ? "formazione"
  : "documenti";

// Ordine di lettura dentro ogni reparto: un corso e il suo aggiornamento stanno
// accanto, il documento "nuovo" prima della revisione. Le offerte nuove vanno in fondo.
const ORDINE = [
  "corso-lavoratori-generale-4h", "corso-lavoratori-specifica-basso-4h", "corso-aggiornamento-lavoratori-6h",
  "corso-antincendio-livello-1", "corso-aggiornamento-antincendio-2h",
  "corso-primo-soccorso-b-c-12h", "corso-aggiornamento-primo-soccorso-4h", "corso-in-azienda-mezza-giornata",
  "dvr-nuovo", "revisione-dvr", "duvri", "pos-cantiere", "nomine-sicurezza", "checkup-documentale-sicurezza",
  "corso-haccp-alimentarista-8h", "manuale-haccp", "aggiornamento-manuale-haccp",
  "informative-privacy", "registro-trattamenti", "nomine-privacy", "formazione-privacy-2h",
  "consulenza-sicurezza-60", "consulenza-finanza-45", "consulenza-fondi-45",
];
const posto = (o: Offerta) => {
  const i = ORDINE.indexOf(o.slug);
  return i === -1 ? ORDINE.length + offerte.indexOf(o) : i;
};

export const catalogo = (Object.keys(categorie) as Categoria[]).map((id) => {
  const lista = offerte.filter((o) => categoriaDi(o) === id).sort((a, b) => posto(a) - posto(b));
  return { id, ...categorie[id], offerte: lista, daPrezzo: Math.min(...lista.map((o) => o.prezzo)) };
});

// Sconto primo ordine rispetto al listino, in percentuale intera.
export const sconto = (o: Offerta) => (o.listino > o.prezzo ? Math.round((1 - o.prezzo / o.listino) * 100) : 0);

// Tre dati in breve per la card, in forma di scheda tecnica.
const dettaglio = (o: Offerta, k: string) => o.dettagli.find((d) => d.k === k)?.v;
const MODALITA: [RegExp, string][] = [
  [/^aula o videoconferenza/, "Aula o video"],
  [/^aula con prov/, "Aula + pratica"],
  [/^in azienda/, "In azienda"],
  [/^videoconferenza/, "Video"],
  [/^videochiamata/, "Videochiamata"],
  [/^sopralluogo/, "Con sopralluogo"],
  [/eventuale sopralluogo/, "A distanza + sopralluogo"],
  [/^a distanza/, "A distanza"],
];
export function scheda(o: Offerta): { k: string; v: string }[] {
  const durata = dettaglio(o, "Durata")?.replace(/^1 ore\b/, "1 ora");
  const consegna = dettaglio(o, "Tempi")?.match(/entro (\d+) giorni lavorativi/)?.[1];
  const mod = dettaglio(o, "Modalità") ?? "";
  const modalita = MODALITA.find(([re]) => re.test(mod))?.[1] ?? mod;
  const attestato = dettaglio(o, "Validità dell'attestato")?.match(/^\d+ anni/)?.[0];
  const righe = [
    durata ? { k: "Durata", v: durata } : consegna ? { k: "Consegna", v: `${consegna} gg lav.` } : null,
    modalita ? { k: "Modalità", v: modalita } : null,
    attestato ? { k: "Attestato", v: `valido ${attestato}` } : { k: "Prezzo a", v: o.unita },
  ];
  return righe.filter((r): r is { k: string; v: string } => !!r);
}
