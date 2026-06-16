# icuraimpresa — sito

Sito vetrina di iCura Impresa S.r.l. (Napoli, dal 2014). Consulenza integrata su sicurezza sul lavoro, engineering, formazione finanziata, finanza agevolata e certificazioni.

## Stack

- **Astro 5** (output static)
- **EmailJS** per il form contatti (client-side, zero backend)
- **Nginx** come web server per i file statici (in produzione)
- **Inter Tight** → sostituita da Helvetica system stack (vedi `src/styles/tokens.css`)

Design system bloccato in `design.md` — leggerlo prima di ogni redesign di pagina. Token CSS in `src/styles/tokens.css`.

## Sviluppo locale

```bash
npm install
npm run dev          # http://localhost:4321
```

## Build

```bash
npm run build        # genera dist/
npm run preview      # serve dist/ per verifica
```

`npm run build` deve funzionare in locale prima di pushare.

## Deploy — Coolify

Il deploy è gestito da Coolify tramite GitHub App. Regole:

- **Build pack**: Dockerfile (NON Nixpacks)
- **Dockerfile**: in root, multi-stage `node:22-alpine` (build) → `nginx:alpine` (runtime)
- **Porta esposta**: `4321`
- **Variabili d'ambiente**: nessuna (le chiavi EmailJS sono nel frontend)
- **`package-lock.json`**: NON committato — il Dockerfile fa `npm install` fresco per ottenere i binari nativi Linux (rolldown, sharp)

### Storia

Nixpacks è stato scartato perché:
1. Binding nativo mancante → rolldown richiede binari Linux non presenti nel lockfile generato su Windows/macOS
2. Nessun start command per output statico → Nixpacks non sa servire i file buildati di Astro

Soluzione adottata: Dockerfile multi-stage.

## Struttura

```
src/
  components/   Nav, Footer, Placeholder
  layouts/      Base.astro
  pages/        index, chi-siamo, bando-isi, contatti, lavora-con-noi,
                lavora-con-noi/admin (dashboard candidature, noindex),
                servizi/* (consulenza, formazione, engineering, finanza-agevolata, certificazioni)
  styles/       tokens.css, global.css
public/
  images/       asset visivi (generati esternamente, vedi feedback memory)
  images/brand/ logo / brand mark
design.md       sistema di design (theme, tipografia, macrostructure)
apps-script/    backend selezionatore HR (Google Apps Script + schema foglio + guida)
Dockerfile      build + runtime per Coolify
```

## Selezionatore HR (Lavora con noi)

`/lavora-con-noi` ospita un questionario psico-attitudinale (16 domande) che invia le candidature
a un Google Sheet tramite Apps Script; `/lavora-con-noi/admin` è la dashboard (login, KPI, mappa
candidati, dettaglio con radar, gestione posizioni).

- Backend e guida in `apps-script/` (`Code.gs`, `INTESTAZIONI_FOGLIO.txt`, `DEPLOY.md`).
- Dopo il deploy della Web App incollare l'URL in `WEBHOOK_URL` dentro
  `src/pages/lavora-con-noi.astro` **e** `src/pages/lavora-con-noi/admin.astro`.
- Finché `WEBHOOK_URL` è vuoto: posizioni di fallback sul sito e dati mock (senza login) nell'admin.

## Note sulle immagini

Le immagini in `/public/images` sono generate esternamente (es. ChatGPT/OpenAI) usando come prompt l'`alt` del componente `Placeholder` e droppate nella cartella. L'`alt` resta scritto in funzione del contenuto reale, mai del placeholder.
