// Contenuti della home a tunnel (testi del cliente, gli stessi delle sezioni verticali).

export const numeri = [
  { n: "2014", l: "a Napoli, S.r.l. dal 2018" },
  { n: "ISO 9001", l: "certificati dal 2019" },
  { n: "SOA OG1", l: "classifica III-bis" },
  { n: "9", l: "persone, guidate da un ingegnere" },
];

export const obiettivi = [
  { t: "Proteggere le persone", aree: [{ label: "Sicurezza sul Lavoro", href: "/servizi/consulenza/sicurezza-lavoro" }, { label: "Formazione", href: "/servizi/formazione" }] },
  { t: "Sviluppare competenze", aree: [{ label: "Formazione", href: "/servizi/formazione" }] },
  { t: "Realizzare un investimento", aree: [{ label: "Finanza Agevolata", href: "/servizi/finanza-agevolata" }, { label: "Engineering", href: "/servizi/engineering" }] },
  { t: "Qualificarmi per nuove opportunità", aree: [{ label: "Sistemi di Gestione", href: "/servizi/certificazioni" }] },
  { t: "Organizzare meglio l’attività", aree: [{ label: "Consulenza", href: "/servizi/consulenza/aziendale" }, { label: "Sistemi di Gestione", href: "/servizi/certificazioni" }, { label: "Digitale e IA", href: "/servizi/digitale" }] },
];

export const aree = [
  {
    titolo: "Consulenza e Sicurezza", slogan: "Proteggi ciò che conta.",
    desc: "Valutiamo i rischi, organizziamo la prevenzione e mettiamo in regola l’impresa: deleghe, modelli 231, privacy, ambiente. Quando arriva un’ispezione, trova un sistema che funziona.",
    comprende: ["Sicurezza D.Lgs. 81/08", "Cantieri", "GDPR e privacy", "HACCP e medicina"],
    href: "/servizi/consulenza", icon: "consulenza", img: "/images/macroaree-consulenza.webp",
    alt: "Consulenza e sicurezza sul lavoro iCura Impresa",
  },
  {
    titolo: "Engineering", slogan: "Costruisci su basi sicure.",
    desc: "Dal rilievo 3D alla progettazione di spazi e impianti, fino alla prevenzione incendi e al collaudo. Una sola squadra, un solo responsabile per pratica.",
    comprende: ["Progettazione", "Rilievi 3D", "Prevenzione incendi e CPI", "Collaudi e perizie"],
    href: "/servizi/engineering", icon: "engineering", img: "/images/macroaree-engineering.webp",
    alt: "Engineering e prevenzione incendi iCura Impresa",
  },
  {
    titolo: "Formazione", slogan: "Il futuro cresce con le persone.",
    desc: "Corsi per sviluppare competenze e rispettare gli obblighi di legge: in aula, a distanza o in azienda, senza fermare il lavoro. Dove possibile, con i fondi già versati.",
    comprende: ["Formazione obbligatoria", "Aula e a distanza", "Fondi interprofessionali", "Attestati e registri"],
    href: "/servizi/formazione", icon: "formazione", img: "/images/macroaree-formazione.webp",
    alt: "Formazione sicurezza in aula iCura Impresa",
  },
  {
    titolo: "Sistemi di Gestione", slogan: "Dai valore a come lavori.",
    desc: "Organizziamo processi e responsabilità e ti accompagniamo fino alla certificazione e alla qualificazione per le gare. La certificazione la rilascia l’organismo: noi ti portiamo fin lì.",
    comprende: ["ISO 9001, 14001, 45001", "ISO 27001 e 37001", "Parità di genere", "Attestazione SOA"],
    href: "/servizi/certificazioni", icon: "certificazioni", img: "/images/macroaree-certificazioni.webp",
    alt: "Certificazioni ISO e attestazione SOA iCura Impresa",
  },
  {
    titolo: "Finanza Agevolata", slogan: "Dai risorse alle tue idee.",
    desc: "Individuiamo i bandi compatibili con i tuoi progetti e li seguiamo dall’inizio alla fine: requisiti, domanda, rendicontazione.",
    comprende: ["Bando ISI INAIL", "ZES Unica Mezzogiorno", "Iper-ammortamento 2026–2028", "Fondi per la formazione"],
    href: "/servizi/finanza-agevolata", icon: "finanza-agevolata", img: "/images/macroaree-finanza-agevolata.webp",
    alt: "Finanza agevolata e bandi iCura Impresa",
  },
  {
    titolo: "Digitale e IA", slogan: "Dai forma digitale al tuo metodo.",
    desc: "Processi digitalizzati, app e gestionali su misura costruiti con l’intelligenza artificiale, integrati con sistemi di gestione e consulenza.",
    comprende: ["Processi digitalizzati", "App su misura", "Gestionali", "Intelligenza artificiale"],
    href: "/servizi/digitale", icon: "digitale", img: "/images/digitale-gestionale.webp",
    alt: "Gestionale digitale su misura iCura Impresa",
  },
] as const;

export const bandi = [
  { badge: "In vigore", titolo: "Accordo Stato-Regioni 17 aprile 2025", meta: "Formazione", cta: "Verifica gli attestati", href: "/servizi/formazione" },
  { badge: "In vigore", titolo: "Patente a crediti", meta: "Cantieri", cta: "Controlla i crediti", href: "/servizi/consulenza/cantieri" },
  { badge: "Aperto", titolo: "Iper-ammortamento 2026–2028", meta: "Investimenti", cta: "Pianifica l’investimento", href: "/servizi/finanza-agevolata" },
  { badge: "Domande chiuse", titolo: "Bando ISI INAIL 2025", meta: "Bandi", cta: "Prepara il progetto", href: "/bando-isi" },
  { badge: "Prossima finestra", titolo: "ZES Unica 2026–2028", meta: "Mezzogiorno", cta: "Verifica i requisiti", href: "/zes-unica" },
];

export const passi = [
  { t: "Ti ascoltiamo", d: "Veniamo in azienda: dove vuoi arrivare e che cosa ti frena." },
  { t: "Definiamo le priorità", d: "Che cosa serve subito, che cosa può aspettare, che cosa si finanzia." },
  { t: "Costruiamo il progetto", d: "Responsabili, date e documenti: un piano chiaro." },
  { t: "Ti affianchiamo nel tempo", d: "Scadenze, verifiche, ispezioni, bandi: ci siamo quando cambia qualcosa." },
];

export const team = [
  { img: "/images/sicurezza-ispezione-capannone.webp", alt: "Area sicurezza e D.Lgs. 81/08 iCura Impresa", h: "Sicurezza sul Lavoro", k: "D.Lgs. 81/08 · Cantieri · HACCP" },
  { img: "/images/consulenza-medicina-lavoro.webp", alt: "Area medicina del lavoro iCura Impresa", h: "Medicina del lavoro", k: "Sorveglianza sanitaria" },
  { img: "/images/formazione-aula-adulti.webp", alt: "Area formazione iCura Impresa", h: "Formazione", k: "Aula · A distanza · In azienda" },
  { img: "/images/chi-siamo-riunione-team.webp", alt: "Area engineering iCura Impresa", h: "Engineering", k: "Progettazione · Prevenzione incendi · Collaudi" },
];
