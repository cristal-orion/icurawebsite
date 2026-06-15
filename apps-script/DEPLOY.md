# Selezionatore HR — guida deploy (Apps Script + Google Sheet)

Il questionario di `/lavora-con-noi` salva le candidature su un Google Sheet tramite un
Apps Script pubblicato come Web App. La dashboard `/lavora-con-noi/admin` legge da lì.
Tutto gira sul **tuo account Google** — il sito resta statico, senza altri server.

## 1. Foglio Google

1. Drive → Nuovo → Foglio Google. Rinominalo es. `Icura — Candidature HR`.
2. (Opzionale) Rinomina la tab `Foglio1` in **`Candidature`** e incolla le intestazioni da
   `INTESTAZIONI_FOGLIO.txt` in A1. Se salti questo passo, le tab vengono create in automatico.

## 2. Apps Script

1. Dal foglio: **Estensioni → Apps Script**.
2. Cancella il codice di esempio in `Code.gs`.
3. Apri `apps-script/Code.gs` da questo repo, copia tutto, incollalo nell'editor.
4. Salva (`Ctrl+S`). Nome progetto es. `Icura HR Backend`.

## 3. Proprietà segrete

In editor: ingranaggio sinistra → **Project Settings** → **Script Properties** → aggiungi:
- `ADMIN_PASSWORD` → la password per accedere alla dashboard
- `ADMIN_TOKEN` → una stringa casuale lunga (32+ caratteri, es. `openssl rand -hex 32`)

(In alternativa: modifica i valori in `setupProperties()` e fai Run una volta, poi rimuovili.)

## 4. Posizioni iniziali

In editor seleziona la funzione **`seedPositions`** → **Run** (autorizza al primo run:
scegli il tuo account → "Avanzate" → "Vai a (sicuro)"). Popola le 5 posizioni icura.

## 5. Deploy come Web App

1. Editor → **Deploy → New deployment**.
2. Ingranaggio accanto a "Select type" → **Web app**.
3. Compila:
   - Description: `v1 production`
   - Execute as: **Me (tuo@gmail.com)**
   - Who has access: **Anyone**  ← obbligatorio, sennò il front-end non può chiamare l'endpoint
4. **Deploy** → autorizza → copia l'URL della **Web app** (`https://script.google.com/macros/s/AKfy.../exec`).

## 6. Inserisci l'URL nel front-end

Incolla l'URL in **DUE** file, nella riga `const WEBHOOK_URL = '';`:
- `src/pages/lavora-con-noi.astro`
- `src/pages/lavora-con-noi/admin.astro`

```js
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfy.../exec';
```

Poi `npm run build` e ridistribuisci il sito (Coolify).

## 7. Test rapido

### Submit (dal sito)
- Apri `/lavora-con-noi` → scegli una posizione → completa il questionario.
- Verifica: il foglio `Candidature` riceve una nuova riga con scoring/categoria popolati.

### Login admin (curl)
```bash
curl -X POST 'https://script.google.com/macros/s/AKfy.../exec' \
  -H 'Content-Type: text/plain;charset=utf-8' \
  -d '{"action":"login","password":"LA_TUA_PASSWORD"}'
```
Risposta attesa: `{"ok":true,"token":"..."}`

### List candidati
```bash
curl -X POST 'https://script.google.com/macros/s/AKfy.../exec' \
  -H 'Content-Type: text/plain;charset=utf-8' \
  -d '{"action":"list","token":"IL_TOKEN_RICEVUTO"}'
```

## 8. Aggiornamenti futuri

Quando modifichi `Code.gs`: **Save** → **Deploy → Manage deployments** → matita sull'attivo →
**Version: New version** → Deploy. L'URL `/exec` resta lo stesso.

## Note di sicurezza

- Password e token vivono solo nelle Script Properties, mai nel front-end.
- Il front-end espone solo il **token di sessione** (in `sessionStorage`), non la password.
- La pagina `/lavora-con-noi/admin` è pubblica come HTML ma i dati richiedono il token: senza
  login non mostra candidature reali. Non è linkata da nav/footer.
- Logout admin: rimuovi `icura_admin_token` dal `sessionStorage` del browser (o pulsante Esci).
- Finché `WEBHOOK_URL` è vuoto: il sito usa posizioni di fallback e l'admin mostra dati mock di esempio.
