// Servizi per area: colonne del mega-menu e fogli delle cartelle nello schedario della home.
// Ogni voce atterra su una pagina servizio o su un'ancora (id sulle card AreaGrid).
export const menu = [
  {
    label: "Consulenza e Sicurezza",
    href: "/servizi/consulenza",
    voci: [
      { label: "Sicurezza sul lavoro (D.Lgs. 81/08)", href: "/servizi/consulenza/sicurezza-lavoro" },
      { label: "Cantieri", href: "/servizi/consulenza/cantieri" },
      { label: "HACCP", href: "/servizi/consulenza/haccp" },
      { label: "Medicina del lavoro", href: "/servizi/consulenza/medicina-lavoro" },
      { label: "GDPR, privacy e cybersecurity", href: "/servizi/consulenza/gdpr" },
      { label: "Ambiente", href: "/servizi/consulenza/ambiente" },
      { label: "Consulenza aziendale", href: "/servizi/consulenza/aziendale" },
    ],
  },
  {
    label: "Engineering",
    href: "/servizi/engineering",
    voci: [
      { label: "Progettazione edile", href: "/servizi/engineering#edile" },
      { label: "Impiantistica", href: "/servizi/engineering#impianti" },
      { label: "Prevenzione incendi e CPI", href: "/servizi/engineering#antincendio" },
      { label: "Direzione lavori, collaudi e perizie", href: "/servizi/engineering#collaudi" },
      { label: "Qualifiche e test materiali", href: "/servizi/engineering#qualifiche" },
      { label: "Pratiche autorizzative", href: "/servizi/engineering#pratiche" },
    ],
  },
  {
    label: "Formazione",
    href: "/servizi/formazione",
    voci: [
      { label: "Formazione lavoratori", href: "/servizi/formazione#cat-lavoratori" },
      { label: "Ruoli · RSPP, RLS, preposti", href: "/servizi/formazione#cat-ruoli" },
      { label: "Antincendio · primo soccorso", href: "/servizi/formazione#cat-emergenze" },
      { label: "Attrezzature · carrelli, PLE", href: "/servizi/formazione#cat-attrezzature" },
      { label: "Fondi interprofessionali", href: "/servizi/formazione#formazione-fondi" },
    ],
  },
  {
    label: "Sistemi di Gestione",
    href: "/servizi/certificazioni",
    voci: [
      { label: "ISO 9001", href: "/servizi/certificazioni/iso-9001" },
      { label: "ISO 14001", href: "/servizi/certificazioni/iso-14001" },
      { label: "ISO 45001", href: "/servizi/certificazioni/iso-45001" },
      { label: "ISO 27001", href: "/servizi/certificazioni/iso-27001" },
      { label: "ISO 37001", href: "/servizi/certificazioni/iso-37001" },
      { label: "Parità di genere", href: "/servizi/certificazioni/parita-genere" },
      { label: "SOA", href: "/servizi/certificazioni/soa" },
    ],
  },
  {
    label: "Digitale e IA",
    href: "/servizi/digitale",
    voci: [
      { label: "Digitalizzazione dei processi", href: "/servizi/digitale#processi" },
      { label: "App su misura con l'IA", href: "/servizi/digitale#app" },
      { label: "Gestionali integrati", href: "/servizi/digitale#gestionali" },
      { label: "Assistenti IA e automazioni", href: "/servizi/digitale#assistenti" },
    ],
  },
  {
    label: "Finanza Agevolata",
    href: "/servizi/finanza-agevolata",
    voci: [
      { label: "Bando ISI INAIL", href: "/bando-isi" },
      { label: "ZES Unica Mezzogiorno", href: "/zes-unica" },
      { label: "Sgravi INAIL · OT23", href: "/servizi/finanza-agevolata#ot23" },
      { label: "Iper-ammortamento 2026–2028", href: "/servizi/finanza-agevolata#iperammortamento" },
      { label: "Fondi interprofessionali per la formazione", href: "/servizi/formazione#formazione-fondi" },
    ],
  },
];
