# Design — Icuraimpresa

Sistema di design bloccato per il sito Icuraimpresa. Ogni redesign di pagina legge questo file prima di emettere codice. Non rigenerare per pagina — estendi o aggiorna questo file quando il sistema deve crescere.

## Genre
modern-minimal

Brand B2B di consulenza (consulenza/sicurezza, formazione, engineering, finanza agevolata, certificazioni). Tono professionale, autorevole, rassicurante. Niente editorial-fall-through, niente atmospheric, niente playful.

## Macrostructure family

| Tipo di pagina | Macrostructure | Variazione consentita |
| --- | --- | --- |
| Home | Marquee Hero | Variazioni nel polish pattern (HP1 vertical-rail) |
| Hub servizi (`/servizi/*`) | Long Document compresso | 5 macro aree: consulenza, formazione, engineering, finanza-agevolata, certificazioni. Hero archetype varia: H2 split, H4 stat, H5 letter |
| Chi siamo | Long Document | Single column, hairline rules |
| Bando ISI | Stat-Led | H4 stat-led hero (369M€), approfondimento di Finanza agevolata |
| Lavora con noi | Marquee Hero · industrial | Hero scuro dedicato + "perché noi". Ospita il selezionatore: profile cards → questionario psico-attitudinale (16 domande) → invio Apps Script. Dashboard candidature a `/lavora-con-noi/admin` (standalone, noindex, re-skin sobrio; eccezione: colori funzionali per data-viz). DOM iniettato via JS → stili in `<style is:global>` namespacati `.page-lavora` / `.page-admin` |
| Contatti | Form-led semplice | Two-column: info + form |

Le pagine condividono nav, footer, type, palette. Variano solo su macrostructure e archetype.

## Theme — custom

Ancorato sui due colori brand: navy (accent primario) + arancione (highlight punteggiato, mai > 1% di viewport).

- `--color-paper`        oklch(99% 0.004 252)   /* bianco neutro con cast freddo leggero */
- `--color-paper-2`      oklch(96.5% 0.005 252) /* superficie elevata · card */
- `--color-paper-3`      oklch(93% 0.007 252)   /* fondo sezione · alternato */
- `--color-ink`          oklch(18% 0.020 252)   /* testo principale · quasi nero con cast navy */
- `--color-ink-2`        oklch(34% 0.018 252)   /* testo secondario · titoletti */
- `--color-muted`        oklch(48% 0.012 252)   /* testo de-emphasised · captions */
- `--color-rule`         oklch(89% 0.008 252)   /* hairline divider principale */
- `--color-rule-2`       oklch(94% 0.006 252)   /* hairline secondario */
- `--color-accent`       oklch(38% 0.115 252)   /* navy · link, CTA primarie, hover */
- `--color-accent-ink`   oklch(99% 0.004 252)   /* testo su accent (paper) */
- `--color-accent-soft`  oklch(95% 0.020 252)   /* fondo tinted accent · sezioni "trust" */
- `--color-highlight`    oklch(67% 0.165 55)    /* arancione · solo numeri, badge, active dot */
- `--color-focus`        oklch(52% 0.205 252)   /* focus ring · accent ad alta chroma */

**Disciplina accent.** Navy è l'accent. Arancione è un highlight token: si usa SOLO su (a) numeri grandi nelle stat (es. 369M€, 100%), (b) badge "in evidenza", (c) la dot di "active link" nella nav. Mai per fill di superficie, mai per CTA secondarie. Footprint combinato accent + highlight ≤ 5% di viewport per gate 25.

## Typography

Single-family discipline su Inter Tight Variable. Geometric-sans moderna, eccellente in italiano, free su `@fontsource-variable/inter-tight`.

- **Display**     · Inter Tight 600–700, letter-spacing `-0.025em`
- **Body**        · Inter Tight 400–500, letter-spacing 0
- **Mono**        · `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (system, solo per dati tabulari rari)

Type scale (clamp() responsive):
- `--text-xs`        clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)
- `--text-sm`        clamp(0.875rem, 0.85rem + 0.15vw, 0.9375rem)
- `--text-md`        clamp(1rem, 0.97rem + 0.18vw, 1.0625rem)
- `--text-lg`        clamp(1.125rem, 1.07rem + 0.3vw, 1.25rem)
- `--text-xl`        clamp(1.375rem, 1.28rem + 0.5vw, 1.625rem)
- `--text-2xl`       clamp(1.75rem, 1.5rem + 1.2vw, 2.25rem)
- `--text-3xl`       clamp(2.25rem, 1.85rem + 2vw, 3rem)
- `--text-4xl`       clamp(3rem, 2.4rem + 3vw, 4.25rem)
- `--text-display-s` clamp(3.5rem, 2.6rem + 4.5vw, 5.5rem)
- `--text-display`   clamp(4rem, 2.8rem + 6vw, 7.5rem)

## Spacing — 4pt scale

- `--space-3xs` 0.25rem · `--space-2xs` 0.5rem · `--space-xs` 0.75rem
- `--space-sm`  1rem    · `--space-md`  1.5rem · `--space-lg`  2rem
- `--space-xl`  3rem    · `--space-2xl` 4.5rem · `--space-3xl` 7rem
- `--space-4xl` 10rem (separazione macro-sezioni hero)

Page gutter: `clamp(1.25rem, 4vw, 2.5rem)`. Max content width: `78rem`. Reading column: `64ch`.

## Motion

- `--ease-out`     `cubic-bezier(0.16, 1, 0.3, 1)`
- `--ease-in`      `cubic-bezier(0.7, 0, 0.84, 0)`
- `--ease-in-out`  `cubic-bezier(0.65, 0, 0.35, 1)`
- `--dur-fast`     140ms · `--dur-base` 220ms · `--dur-slow` 380ms

Pattern reveal: nessuno sopra la fold. Sotto la fold: opacity fade ≤ 240ms su intersection observer. Niente bounce, niente overshoot, niente parallax. `prefers-reduced-motion: reduce` → tutto a opacity ≤ 150ms, niente translate.

## Microinteractions stance

- Hover su CTA primaria: shift background a `accent` darker step (+L 4%) in 140ms.
- `:focus-visible`: ring di 2px in `--color-focus`, offset 2px, **mai animato**.
- Link inline: underline 1px sempre visibile, thicken al hover in 140ms.
- Tooltip: delay hover 800ms, focus 0ms (mai usato in questo brief, ma regola in vigore).
- Toast / conferma form: nessun animation celebratory. Cambio inline-status. Success silent.

## CTA voice

- **Primary** · `accent` fill, paper ink, radius `--radius-pill` (999px), padding `0.75rem 1.5rem`, font-weight 500, letter-spacing 0.
- **Secondary** · outline 1px `--color-ink`, transparent fill, same shape/padding.
- **Tertiary** · typographic link, freccia inline `→`, underline 1px sempre, thicken al hover.

Copy CTA: verbi diretti italiani — "Richiedi consulenza", "Prenota", "Scopri", "Scrivici". Niente "Scopri di più" senza specificità.

## Image strategy

Tutte le immagini sono **placeholder** in questa fase. Pattern:

```html
<figure class="placeholder" data-aspect="16/9">
  <span class="placeholder__label">[IMG] Descrizione di ciò che andrà qui</span>
</figure>
```

Lo `alt` del placeholder finale descrive il *contenuto previsto*, non il placeholder. Quando l'utente sostituirà con immagini reali, l'alt sarà già corretto.

Esempio: `alt="Team di consulenti Icuraimpresa in riunione operativa, ufficio Napoli, luce naturale"` — non `alt="placeholder"`.

## Per-page allowances

- Tutte le pagine: tipografia + placeholder come unica imagery.
- Marketing (home, bando-isi): UN solo highlight orange per pagina (numero o badge).
- Hub servizi: tabular spec sheet (F3) consentito per liste competenze.
- Niente enrichment Tier-C/D (no generated illustrations). Niente Lottie.

## What pages MUST share

- Wordmark "Icuraimpresa" + tagline "Vivi Sicuro!" (in nav e footer mast).
- Accent navy + highlight orange, footprint vincolato.
- Inter Tight variable.
- Nav N5 floating-pill (modern-minimal default), con dropdown "Servizi" sulle 5 macro aree.
- Footer Ft1 mast-headed con wordmark, tagline, contatti, link essenziali.
- Section heading rhythm: eyebrow opzionale (mono micro-cap, 1-2 per pagina max), display heading.

## What pages MAY differ on

- Macrostructure entro la family (home → Marquee, bando-isi → Stat-Led).
- Hero archetype.
- Densità contenuto (hub servizi può essere più denso, home più ariosa).

## Anti-patterns specifici per Icuraimpresa

Vietati esplicitamente — il sito originale ne aveva versioni:

- ❌ Sezioni di testo > 4 frasi consecutive senza break visivo.
- ❌ Liste di "Mission/Vision/Values" come tre card uguali (gate 19 universal).
- ❌ Progress bar "100% Affidabilità / 100% Trasparenza / 100% Consulenza" (rating senza scala = slop).
- ❌ Loghi enti pubblici (INPS/INAIL/Camera Commercio) come "partnership" decorativa — solo se è una vera proof e in monocromia hairline.
- ❌ Carosello di servizi con 12 voci. Max 4 categorie sintetiche.
- ❌ Form contatti con > 4 campi visibili.

## Exports

### tokens.css
Sorgente di verità: `src/styles/tokens.css`. Importato in ogni pagina via layout.

### Tailwind v4 / DTCG
Non in scope per questa fase (no Tailwind nel progetto). Da aggiungere se il progetto adotterà Tailwind più avanti.
