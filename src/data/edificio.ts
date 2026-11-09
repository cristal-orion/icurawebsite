// Home "edificio": ogni area del sito è un piano di un palazzo, scelto in base a che
// cosa fa l'area (l'engineering sta nelle fondamenta, i bandi sul tetto a guardare
// lontano, la formazione nelle aule…). I testi sono quelli della home e del menu:
// qui si decide solo a quale piano va cosa e che arredo 3D ha (`kind`).
import { aree, bandi, passi, numeri, obiettivi } from "./home";
import { menu } from "./menu";

export type Kind = "impianti" | "hall" | "sicurezza" | "aule" | "archivio" | "server" | "riunioni" | "osservatorio";

export interface Voce { t: string; k?: string; href?: string }
export interface Piano {
  id: string;
  /** etichetta sulla pulsantiera dell'ascensore */
  tasto: string;
  /** nome del piano nell'edificio */
  nome: string;
  kind: Kind;
  titolo: string;
  slogan: string;
  desc: string;
  href: string;
  cta: string;
  voci: Voce[];
  vociTitolo: string;
  numeri?: boolean;
}

const area = (href: string) => aree.find((a) => a.href === href)!;
const vociDi = (href: string): Voce[] => (menu.find((m) => m.href === href)?.voci ?? []).map((v) => ({ t: v.label, href: v.href }));

const daArea = (href: string, p: Pick<Piano, "id" | "tasto" | "nome" | "kind">): Piano => {
  const a = area(href);
  return {
    ...p,
    titolo: a.titolo,
    slogan: a.slogan,
    desc: a.desc,
    href: a.href,
    cta: `Vai a ${a.titolo}`,
    voci: vociDi(href),
    vociTitolo: "Su questo piano",
  };
};

// I quattro passi della hall (stesso ordine di `passi`) aprono la parte del sito che li racconta.
const LINK_PASSI = ["/contatti", "/chi-siamo#metodo", "/chi-siamo#competenze", "/chi-siamo#team"];

// Dal basso verso l'alto: l'indice è il piano nell'edificio (0 = interrato).
export const piani: Piano[] = [
  daArea("/servizi/engineering", { id: "engineering", tasto: "−1", nome: "Fondamenta e impianti", kind: "impianti" }),
  {
    id: "chi-siamo", tasto: "T", nome: "Hall · Accoglienza", kind: "hall",
    titolo: "Chi siamo", slogan: "Nove persone, guidate da un ingegnere.",
    desc: "A Napoli dal 2014: un solo referente per sicurezza, formazione, engineering, certificazioni e bandi. Prima di iniziare, un preventivo scritto che dice che cosa è compreso e chi fa che cosa.",
    href: "/chi-siamo", cta: "Conosci il team",
    voci: passi.map((p, i) => ({ t: p.t, k: p.d, href: LINK_PASSI[i] })), vociTitolo: "Come lavoriamo",
    numeri: true,
  },
  daArea("/servizi/consulenza", { id: "consulenza", tasto: "1", nome: "Piano sicurezza", kind: "sicurezza" }),
  daArea("/servizi/formazione", { id: "formazione", tasto: "2", nome: "Aule", kind: "aule" }),
  daArea("/servizi/certificazioni", { id: "certificazioni", tasto: "3", nome: "Archivio e audit", kind: "archivio" }),
  daArea("/servizi/digitale", { id: "digitale", tasto: "4", nome: "Sala server", kind: "server" }),
  daArea("/servizi/finanza-agevolata", { id: "finanza-agevolata", tasto: "5", nome: "Sala riunioni", kind: "riunioni" }),
  {
    id: "bandi", tasto: "Tetto", nome: "Osservatorio", kind: "osservatorio",
    titolo: "Bandi e scadenze", slogan: "Sempre aggiornati, verificati su fonti ufficiali.",
    desc: "Norme in vigore, agevolazioni aperte e prossime finestre: ti diciamo che cosa riguarda la tua impresa e che cosa fare adesso. Stato e date verificati al 7 ottobre 2026.",
    href: "/servizi/finanza-agevolata", cta: "Vai alla finanza agevolata",
    voci: bandi.map((b) => ({ t: b.titolo, k: `${b.badge} · ${b.cta}`, href: b.href })), vociTitolo: "Dall'osservatorio",
  },
];

export { numeri };

// "Scegli un obiettivo": quali piani accendere. Le aree linkate cadono in un piano per
// prefisso dell'indirizzo; il tetto (bandi) è escluso perché condivide l'indirizzo
// con la finanza agevolata.
const pianiArea = piani.filter((p) => p.id !== "bandi");
export const obiettiviPiani = obiettivi.map((o) => ({
  t: o.t,
  ids: [...new Set(o.aree.map((a) => pianiArea.find((p) => a.href.startsWith(p.href))?.id).filter((x): x is string => !!x))],
}));
