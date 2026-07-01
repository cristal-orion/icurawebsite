# Piano d'azione — Modifiche sito iCura Impresa

Documento di lavoro basato sulle note del cliente (Marco) + ricognizione del codice attuale.
Design system di riferimento: `design.md` (genre **modern-minimal**, tema custom navy + highlight arancione, Inter Tight). Tutte le modifiche restano dentro questi vincoli.

---

## ⚠️ Premessa importante: gli screenshot del cliente sono di una versione VECCHIA

Le 5 immagini del documento mostrano un sito **precedente** all'ultima ristrutturazione:
- nav con "Bando ISI" come voce top-level e **senza** "Lavora con noi";
- sezione Servizi coi **vecchi nomi** ("Sicurezza sul lavoro", "Sicurezza nei cantieri", "HACCP", "Medicina del lavoro", "GDPR & Privacy").

Il sito **attuale** ha invece: nav con dropdown "Servizi" sulle **5 macro aree** (Consulenza, Formazione, Engineering, Finanza agevolata, Certificazioni) + "Lavora con noi". Quindi alcune note sono già parzialmente superate. Sotto ho rimappato ogni nota sul codice **reale** di oggi.

---

## Mappa note cliente → stato attuale → intervento

| # | Nota cliente | Dove sta oggi | Intervento | Taglia |
|---|---|---|---|---|
| 0 | Brand sempre come **"iCura Impresa"** | "Icuraimpresa" ovunque (nav, footer, copy, meta, alt, `design.md`) | Rinomina display-name sitewide. Dominio/email restano `icuraimpresa.it` | M |
| 1 | Hero: solo titolo in fold, descrizione al primo scroll | `index.astro` hero "Cantieri, cucine, capannoni" | Reveal progressivo lede+CTA allo scroll + scrim più forte per leggibilità | M |
| 2 | Newsletter | non esiste | Nuovo blocco iscrizione (serve backend, vedi decisioni) | M |
| 3 | Sezione **team** in home → pagina dedicata | non esiste | Sezione team in home + nuova pagina `/team` | L |
| 4 | "Una mail, una chiamata, un sopralluogo" troppo spoglia | `index.astro` sezione `closing` (riga ~254) | Arricchire: immagine rassicurativa + microcopy ("sopralluogo gratuito · 48h") | S |
| 5 | "Vuoi conoscerci?" in Chi Siamo troppo spoglia | `chi-siamo.astro` (riga ~85) | Stesso trattamento della #4 (componente CTA condiviso) | S |
| 6 | "Capiamo di cosa ha bisogno" → immagine rassicurativa | era la vecchia CTA finale, oggi fusa nella #4 | Coperto da #4 (immagine nella CTA band) | — |
| 7 | Servizi: poco testo, **icone** + vista a **griglia** | `index.astro` sezione `servizi` (è una `<ol>` lista) | Da lista → griglia con icone (SVG line, no Lottie) per le 5 aree | M |
| 8 | Google Maps nei Contatti | `contatti.astro` two-col info+form | ✅ Mappa embed (iframe) in fondo a /contatti + link "Apri in Google Maps" | S |
| 9 | Bando ISI → ~~landing interattiva~~ | — | ❌ ANNULLATO — il cliente ha rimosso il Bando ISI dal sito (sezione home + pagina `/bando-isi` + link eliminati) | — |
| 10 | Mancano **social proof e recensioni** | non esistono | ❌ NON si fa — il cliente al momento non ha recensioni (niente contenuti inventati) | — |

---

## Vincoli di design da rispettare (Hallmark + design.md)

- **Niente contenuti inventati.** Recensioni, testimonianze, numeri, nomi del team NON si inventano. Servono dati reali del cliente, altrimenti placeholder etichettati. (Hallmark gate 56)
- **Immagini = placeholder** con `alt` descrittivo-come-prompt (pattern già in uso): l'immagine vera si dropperà dopo in `/public/images`.
- **Highlight arancione ≤ 5% viewport**, solo su numeri/badge/active dot. Accent = navy.
- **Icone**: SVG line costruite a mano (Tier A/B), coerenti, monocromatiche. Niente librerie pesanti, niente Lottie.
- **Motion**: il `design.md` dice "nessun reveal sopra la fold". Per la #1 facciamo un reveal *appena sotto* la fold (lede/CTA), sottile, `prefers-reduced-motion` safe — è un'estensione deliberata della regola, la annoto nel design system.
- **Form contatti**: max 4 campi visibili.

---

## Fasi proposte (ordine consigliato)

### Fase 0 — Fondamenta `[blocca tutto]`
- **Rinomina brand → "iCura Impresa"** in: `Nav.astro`, `Footer.astro`, copy + meta di tutte le pagine, `alt`, `design.md`. Lasciare invariati dominio/email/URL.
- (Opzionale, correlato) Ho visto `Logo.png` e `logotipo.png` nel root: se è il **logo definitivo** atteso, lo integriamo nel wordmark di nav/footer in questa fase.

### Fase 1 — Homepage ✅ COMPLETA
1. ✅ Hero reveal + leggibilità (#1)
2. ✅ Servizi → griglia con icone (#7) — nuovo `ServiceIcon.astro`
3. ✅ CTA finale arricchita + immagine (#4/#6) — nuovo `CtaBand.astro` riusabile
4. ✅ Team (#3) — messo in **Chi Siamo** (`#team`), non in home. Link "Conosci il team" → `/chi-siamo#team`
5. ~~Newsletter (#2)~~ — RIMANDATA
6. ❌ Social proof / recensioni (#10) — NON si fa (nessuna recensione al momento)

### Fase 2 — Pagine interne ✅ COMPLETA
- ✅ Chi Siamo: "Vuoi conoscerci?" col componente CtaBand (#5)
- ✅ Team (#3) — fatto in Chi Siamo (niente pagina `/team` separata, decisione cliente)
- ✅ Contatti: Google Maps embed iframe (#8)

### Fase 3 — ❌ ANNULLATA
Il cliente ha deciso di **rimuovere del tutto il Bando ISI** dal sito (sezione home,
pagina `/bando-isi` e link). Niente landing interattiva.

---

## Decisioni del cliente (DEFINITE ✓)

1. **Recensioni/social proof** → **le fornisce il cliente**. Costruisco il componente con slot/placeholder etichettati; i testi reali (testo + nome/azienda) li inserisce Marco. Nessun testo inventato.
2. **Newsletter** → **RIMANDATA**. Esce dalla Fase 1, non si fa ora.
3. **Team** → **placeholder ora** (struttura + foto placeholder con alt-come-prompt; reali dopo).
4. **Google Maps** → **embed iframe classico** (mappa interattiva sempre attiva). ⚠️ Setta cookie Google → da coordinare col banner consenso GTM (TODO aperto).

---

## Note tecniche aperte
- Sito **statico** (Astro `output: static`): newsletter e form richiedono un endpoint esterno.
- Google Maps iframe setta cookie → implicazioni consenso GDPR (vedi TODO banner GTM).
- La rinomina brand tocca anche `design.md` (sezione "What pages MUST share").
