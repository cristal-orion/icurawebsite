# Design — iCura Impresa

Sistema di design bloccato per il sito iCura Impresa. Ogni redesign di pagina legge questo file prima di emettere codice. Non rigenerare per pagina — estendi o aggiorna questo file quando il sistema deve crescere.

## Genre
**clinical-tech** (giugno 2026 — scelto dal cliente fra 4 proposte; era la "Proposta 3").

Brand B2B di consulenza (sicurezza sul lavoro, formazione, engineering, finanza agevolata, certificazioni). Tono **tecnico, preciso, autorevole, clinico**: navy profondo + accent blu, tipografia grottesca decisa, foto in bianco-e-nero che prendono colore. Niente playful, niente atmospheric, niente editorial-fall-through.

## Macrostructure family

| Tipo di pagina | Macrostructure | Note |
| --- | --- | --- |
| Home | Hero split + griglia servizi | Layout "Proposta 3": hero a due colonne (foto grayscale ⟶ pannello navy con metriche), strip agevolazioni blu, griglia 5 servizi (card bianche + navy), pilastri "perché", tessere team, sezione contatti+form. |
| Hub servizi (`/servizi/*`) | Long Document compresso | 5 macro aree: consulenza, formazione, engineering, finanza-agevolata, certificazioni. page-header + contesto + AreaGrid + FeatureRow + checklist + Steps + FAQ + CtaBand. |
| Chi siamo | Long Document | page-header con fatti, competenze, timeline, metodo, team, CtaBand. |
| Bandi (ZES / ISI) | Stat-Led | page-header + strip fatti (numeri) + AreaGrid + Steps + FAQ + CtaBand. |
| Lavora con noi | Marquee Hero · industrial | Hero scuro + "perché noi". Ospita il selezionatore: profile cards → questionario psico-attitudinale (16 domande) → invio Apps Script. Dashboard candidature a `/lavora-con-noi/admin` (standalone, noindex). DOM iniettato via JS → stili in `<style is:global>`. |
| Contatti | Form-led | Two-column: info + form, mappa Google gated dietro consenso. |

Le pagine condividono nav, footer, type, palette. Variano solo su macrostructure e archetype.

## Theme — clinical-tech

Tre poli: **navy** (superfici scure + testo), **blu** (accent di sistema), **off-white freddo** (sfondi). **Amber** è un highlight raro. Sorgente di verità: `src/styles/tokens.css`.

- `--color-paper`        `#f8fafc`              /* sfondo pagina · off-white freddo */
- `--color-paper-2`      `#f1f5f9`              /* superficie elevata · card */
- `--color-paper-3`      `#e2e8f0`              /* fondo sezione alternato */
- `--color-paper-blue`   `#eff6ff`              /* tint blu chiaro · sezioni "trust" */
- `--color-ink`          `#0f172a`              /* navy · testo principale + sezioni scure full-width */
- `--color-ink-2`        `#334155`              /* testo secondario */
- `--color-muted`        `#64748b`              /* caption · de-emphasis */
- `--color-ink-inset`    `#1e293b`              /* card/box su fondo navy */
- `--color-accent`       `#3b82f6`              /* blu · link, eyebrow, CTA, tick, hover */
- `--color-accent-hover` `#2563eb`              /* blu scuro · hover CTA */
- `--color-accent-soft`  `#dbeafe`              /* fondo tinted accent · tick, soft */
- `--color-highlight`    `#f59e0b`              /* amber · raro: badge "in evidenza" */
- `--color-focus`        `#2563eb`              /* focus ring */

**Disciplina accent.** Il **blu** è l'accent di sistema: lo si usa liberamente su eyebrow, link, CTA, tick, dettagli interattivi, una-parola-evidenziata nei titoli. Il **navy** è la superficie scura strutturale (hero, banda `.section--ink`, footer). L'**amber** è un highlight puntuale: solo badge "in evidenza"/scadenze, mai per fill di superficie o CTA. Footprint amber ≤ 1% viewport.

## Typography

Tre famiglie, self-hosted via `@fontsource-variable` (importate in `Base.astro`):

- **Display** · **Bricolage Grotesque Variable** (titoli, wordmark, numeri grandi). Pesi 600–700, letter-spacing `-0.025em`. Una parola in *corsivo* o in blu come accento tipografico nei titoli di sezione.
- **Body** · **Inter Tight Variable** (testo corrente, CTA, UI). Pesi 400–500.
- **Mono** · **JetBrains Mono Variable** (eyebrow, label uppercase, metriche, chip normative, dati tabulari). Pesi 400–600, uppercase + tracking largo.

Type scale clamp() responsive (`--text-xs` … `--text-display`) invariata in `tokens.css`.

## Spacing — 4pt scale
`--space-3xs` 0.25rem … `--space-4xl` 10rem. Page gutter `clamp(1.25rem, 4vw, 2.5rem)`. Max content `78rem`. Reading column `64ch`.

## Radius
- `--radius-input` 8px · `--radius-card` 12px · `--radius-lg` 16px (hero/feature) · `--radius-pill` 999px.

## Image strategy

**Foto reali in bianco-e-nero che prendono colore.** Le immagini in card/tessere/feature partono in `grayscale(100%)` e virano a colore all'hover del contenitore (utility `.media-grayscale` + `.group` in `global.css`). Le foto hero/statement possono restare a colori pieni. WebP, lato max ~1600–2000px. `alt` descrittivo del contenuto reale. `public/images/` è in `.gitignore` → nuove immagini vanno forzate con `git add -f`.

## Motion
- Easing `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`; durate `--dur-fast` 140ms · `--dur-base` 220ms · `--dur-slow` 380ms.
- **Scroll reveal** globale (in `Base.astro` + `global.css`): fade-up morbido sotto la piega, progressive-enhancement, `prefers-reduced-motion` safe, niente flash sopra la piega. Hero: entrata dedicata consentita. Niente parallax aggressivo, niente bounce/overshoot.
- Hover immagini: grayscale → colore in `--dur-slow`.

## CTA voice
- **Primary** · fill **blu** (`--color-accent`), testo bianco, pill (999px), hover `--color-accent-hover`. Variante hero con `--shadow-accent` (glow blu).
- **Nav CTA** · pill **navy → blu su hover** ("Richiedi consulenza").
- **Secondary** · outline 1px navy, hover fill navy.
- **Tertiary** · link tipografico con freccia inline `→`, underline 1px che s'ispessisce.

Copy: verbi diretti italiani — "Richiedi consulenza", "Prenota", "Scopri", "Scrivici".

## What pages MUST share
- Wordmark "iCura Impresa" (accent blu sul punto/dettaglio) + tagline "Vivi Sicuro!" (footer).
- Palette navy + blu + off-white; amber solo highlight.
- Bricolage Grotesque (display) / Inter Tight (body) / JetBrains Mono (label).
- Nav fissa con mega-menu "Servizi" (5 macro aree) + gruppo Agevolazioni; mobile a hamburger.
- Footer navy mast con wordmark, tagline, contatti, link.
- Section heading rhythm: eyebrow mono blu (1-2/pagina) → display heading Bricolage.

## Anti-patterns specifici per iCura Impresa
- ❌ Sezioni di testo > 4 frasi consecutive senza break visivo.
- ❌ Liste "Mission/Vision/Values" come tre card uguali.
- ❌ Progress bar "100% Affidabilità" (rating senza scala = slop).
- ❌ Loghi enti pubblici (INPS/INAIL) come "partnership" decorativa.
- ❌ Carosello servizi con 12 voci. Max 5 macro aree.
- ❌ Form contatti con troppi campi: tenere essenziale (nome, email, area, messaggio).
- ❌ Niente contenuti inventati (recensioni/numeri/clienti). Solo dati reali o placeholder etichettati.

## Exports
### tokens.css
Sorgente di verità: `src/styles/tokens.css`. Importato in ogni pagina via `Base.astro`.
### Tailwind
Non in scope (no Tailwind nel progetto — CSS custom + token). Il prototipo `proposte/home-3.astro` usava Tailwind CDN solo come bozza; la produzione è CSS vero.
