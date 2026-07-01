# Piano immagini iCura Impresa

Analisi del sito Astro in `../src`, degli asset in `../public/images` e del riferimento competitor `https://qualificagroup.it/consulenza/`.

## Direzione visiva

Il sito parla a PMI e imprese italiane su consulenza integrata: sicurezza sul lavoro, HACCP, medicina del lavoro, ambiente, GDPR, engineering, certificazioni, formazione e finanza agevolata. Le immagini devono restare operative e credibili: ambienti reali, consulenti al lavoro, documenti e sopralluoghi, niente stock patinato.

Stile coerente con gli asset attuali:

- fotografia documentaria professionale;
- palette desaturata navy, grigio, acciaio, carta, piccoli accenti giallo/arancio solo se naturali;
- adulti 30-55 anni in contesti B2B italiani;
- niente loghi, enti pubblici, testo leggibile o watermark;
- niente strette di mano, sorrisi frontali o pose da banca immagini.

## Asset esistenti rilevanti

Trovati in `../public/images`:

- `home-cantiere-planimetria.webp`: hero home, cantiere/planimetria.
- `sicurezza-ispezione-capannone.webp`: consulenza, sicurezza, Bando ISI.
- `home-cnc-barriera.webp`: macchinario/CNC, CTA home, ZES, engineering.
- `formazione-aula-adulti.webp`: formazione in aula.
- `engineering-render-cad-impianti.webp`: engineering/CAD impianti.
- `certificazioni-audit-iso.webp`: certificazioni/audit.
- `bando-linea-produzione.webp`: finanza agevolata, investimenti produttivi.
- `bando-documenti-inail.webp`: finanza/documentazione bando.
- `chi-siamo-riunione-team.webp`, `chi-siamo-scrivania-firma.webp`, `team-icura.webp`: chi siamo/team/metodo.
- `esternoicura.webp`, `contatti-facciata-secondigliano.webp`: contatti/sede.
- `macroaree-*.webp`: cinque immagini tonde per Consulenza, Formazione, Engineering, Finanza agevolata, Certificazioni.

## Gap principali

Il sito e gli articoli sono già coperti, ma alcuni temi riusano immagini troppo generiche:

- HACCP e sicurezza alimentare nella pagina Consulenza.
- Medicina del lavoro e sorveglianza sanitaria.
- Ambiente, rifiuti, AUA/MUD.
- GDPR/privacy.
- SOA, gare, avvalimenti.
- ZES Unica e Transizione 5.0 come immagini articolo dedicate, distinte dal generico CNC.
- Bando ISI: immagine più specifica su click day/documentazione tecnica o sostituzione macchinari.

## Set consigliato da generare

### 1. HACCP / Sicurezza alimentare

Nome consigliato: `consulenza-haccp-cucina.webp`

Uso:

- pagina `servizi/consulenza`, vicino alla card "Sicurezza alimentare (HACCP)";
- eventuale articolo dedicato HACCP.

Prompt:

```text
Photorealistic 16:9 documentary website photo for an Italian workplace and food safety consulting company. Clean commercial kitchen, stainless steel prep table, refrigerators and hygiene station visible. Adult consultant in subtle navy jacket and disposable hair cover reviews a HACCP checklist on a clipboard with a restaurant manager wearing apron; both focused on the work surface, not looking at camera. Natural morning light, sober navy/gray/stainless palette, realistic and professional. No logos, no readable text, no watermark, no exaggerated smiles, no handshake, no messy kitchen, no stock-photo pose.
```

Alt:

```text
Consulente iCura Impresa durante un controllo HACCP in una cucina professionale: adulto con copricapo monouso e giacca navy verifica una checklist con il responsabile del locale, piano in acciaio e ambiente ordinato, luce naturale, fotografia documentaria professionale
```

### 2. Medicina del lavoro

Nome consigliato: `consulenza-medicina-lavoro.webp`

Uso:

- pagina `servizi/consulenza`, sezione medicina del lavoro;
- CTA o card su sorveglianza sanitaria.

Prompt:

```text
Photorealistic 16:9 documentary website photo for an Italian occupational health consulting company. Quiet temporary medical room inside a medium company office, privacy screen, sealed forms, blood pressure monitor, ergonomic chair, soft daylight. Adult occupational physician in white coat checks blood pressure for a worker in navy workwear; consultant folder visible with no readable text. Calm, precise, respectful, clinical-office light, cool white/navy/gray palette. No logos, no readable medical forms, no watermark, no emergency hospital mood, no stethoscope cliché close-up, no stock-photo pose.
```

Alt:

```text
Medico competente durante una visita di sorveglianza sanitaria in azienda: adulto in camice misura la pressione a un lavoratore in abbigliamento tecnico, stanza riservata e ordinata, luce naturale, atmosfera professionale e rispettosa
```

### 3. Ambiente / Rifiuti / AUA-MUD

Nome consigliato: `consulenza-ambiente-rifiuti.webp`

Uso:

- pagina `servizi/consulenza`, area consulenza ambientale;
- articolo futuro su AUA, MUD o gestione rifiuti.

Prompt:

```text
Photorealistic 16:9 documentary website photo for an Italian environmental compliance consulting company. Orderly industrial warehouse service area with waste containers, pallets, recycling station, safety markings on the floor, open binder and tablet on a small inspection table. Adult environmental consultant in navy jacket and safety vest reviews waste-management registers with a plant manager in workwear; they inspect containers and documents. Daylight from high windows, sober, competent, concrete, desaturated navy/gray palette with muted yellow safety markings. No logos, no readable text, no hazardous spill, no landfill, no dirty chaotic scene, no watermark, no smiles at camera, no handshake.
```

Alt:

```text
Consulente ambientale iCura Impresa in un'area rifiuti ordinata di un capannone industriale: due adulti verificano registri, contenitori e procedure AUA/MUD, pavimento segnato e luce naturale dall'alto, fotografia documentaria professionale
```

### 4. GDPR / Privacy

Nome consigliato: `consulenza-gdpr-privacy.webp`

Uso:

- pagina `servizi/consulenza`, area GDPR;
- eventuale articolo su DPO, registro trattamenti o audit privacy.

Prompt:

```text
Photorealistic 16:9 documentary website photo for an Italian business compliance website. Modern but modest office meeting room, frosted glass partition, laptop with blurred dashboard, printed privacy registry pages and folders on a table, no readable text. Adult privacy consultant in navy blazer explains a data-processing map to a small business owner; both seated side-by-side reviewing documents. Natural daylight, quiet, rigorous, confidential, navy/gray/paper white palette. No logos, no readable text, no cyberpunk visuals, no padlock icons, no floating digital graphics, no watermark, no handshake, no stock-photo pose.
```

Alt:

```text
Consulente privacy iCura Impresa durante un audit GDPR in ufficio: due adulti esaminano registro trattamenti, laptop e documenti non leggibili su un tavolo ordinato, luce naturale e atmosfera riservata
```

### 5. SOA / Gare / Avvalimenti

Nome consigliato: `certificazioni-soa-gare.webp`

Uso:

- pagina `servizi/certificazioni`, card SOA e procedure di gara;
- articolo futuro su attestazione SOA.

Prompt:

```text
Photorealistic 16:9 documentary website photo for an Italian certification and public tender consulting company. Sober office table with construction plans, tender dossier folders, calculator, laptop with blurred procurement portal, and a small hard hat at the edge; no readable text. Adult certification consultant and construction company owner review SOA/tender documentation together, hands pointing at plans and checklists, faces partially visible and focused. Natural side light, rigorous, practical, trustworthy, paper white/navy/graphite palette with muted safety yellow. No logos, no official public-entity marks, no readable text, no watermark, no staged certificate pose, no excessive orange, no stock-photo smiles.
```

Alt:

```text
Consulente certificazioni iCura Impresa durante la preparazione di una pratica SOA e di gara: piani di cantiere, dossier, laptop e casco su un tavolo, due adulti verificano requisiti e documentazione, luce naturale e stile documentario
```

### 6. ZES / Transizione 5.0 / Investimenti

Nome consigliato: `finanza-zes-transizione-impianto.webp`

Uso:

- pagina `zes-unica`;
- pagina `servizi/finanza-agevolata`, card ZES e Transizione 5.0;
- articolo ZES/Transizione.

Prompt:

```text
Photorealistic 16:9 documentary website photo for an Italian finance-incentives consulting company. Medium Italian manufacturing facility with a new CNC or automated production machine, energy monitoring panel with blurred interface, safety barriers, clean floor markings. Adult consultant in navy jacket and plant owner in workwear review investment figures on a tablet beside the new machinery; both focused on the equipment and numbers, not looking at camera. Bright realistic factory daylight, competent, opportunity-oriented but not flashy, graphite/navy/steel gray palette with muted yellow safety barriers. No logos, no readable text or numbers, no futuristic neon, no fake holograms, no watermark, no handshake, no triumphant pose.
```

Alt:

```text
Consulente di finanza agevolata iCura Impresa in uno stabilimento produttivo: consulente e titolare valutano su tablet un investimento in nuovo macchinario e monitoraggio energetico, barriere di sicurezza e luce naturale, fotografia industriale documentaria
```

### 7. Bando ISI / Click day

Nome consigliato: `bando-isi-click-day-documenti.webp`

Uso:

- pagina `bando-isi`;
- card "Bando ISI INAIL" nella pagina finanza.

Prompt:

```text
Photorealistic 16:9 documentary website photo for an Italian workplace safety funding article. Desk in a consulting office before a grant deadline: laptop with blurred portal screen, technical risk assessment documents, calculator, checklist, small model of industrial machine or machine-safety diagram, coffee cup at edge. Adult consultant's hands organizing documents and checking a timeline, no visible face needed. Morning side light, focused, precise, deadline-ready, navy/gray/paper palette with one restrained orange marker. No logos, no INAIL mark, no readable text, no real public portal text, no watermark, no dramatic stress, no generic stock business handshake.
```

Alt:

```text
Documentazione tecnica per il Bando ISI preparata su una scrivania di consulenza: laptop con schermata non leggibile, checklist, calcolatrice e fascicoli ordinati, mani di un consulente al lavoro prima del click day, luce naturale
```

## Mappa di sostituzione consigliata

- `src/pages/servizi/consulenza.astro`
  - mantenere `sicurezza-ispezione-capannone.webp` come immagine hero;
  - usare nuovi asset HACCP, medicina, ambiente e GDPR se in futuro si aggiungono immagini alle card o sezioni di approfondimento.

- `src/pages/servizi/finanza-agevolata.astro`
  - mantenere `bando-linea-produzione.webp` per la sezione generale;
  - usare `finanza-zes-transizione-impianto.webp` per ZES/Transizione;
  - usare `bando-isi-click-day-documenti.webp` per Bando ISI.

- `src/pages/bando-isi.astro`
  - sostituire la CTA che oggi riusa `sicurezza-ispezione-capannone.webp` con `bando-isi-click-day-documenti.webp` se si vuole un taglio più articolo/finanza.

- `src/pages/zes-unica.astro`
  - sostituire la CTA che oggi usa `home-cnc-barriera.webp` con `finanza-zes-transizione-impianto.webp` per distinguere ZES da engineering.

- `src/pages/servizi/certificazioni.astro`
  - mantenere `certificazioni-audit-iso.webp` per ISO;
  - aggiungere `certificazioni-soa-gare.webp` per SOA/gare se si crea una sezione o un articolo dedicato.

## Nota tecnica

Il tool di generazione immagini integrato ha renderizzato le richieste in sessione, ma non ha salvato file recuperabili sotto `$CODEX_HOME/generated_images` in questa esecuzione. Per questo questo documento conserva i prompt finali e la mappa di inserimento, così gli asset possono essere rigenerati con lo stesso brief e salvati con i nomi indicati.
