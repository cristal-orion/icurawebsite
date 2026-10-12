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
