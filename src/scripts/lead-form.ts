// Invio lead a Klaviyo — client-side, con la Public API Key (Site ID).
// La chiave pubblica e il List ID NON sono segreti: possono stare nel codice del sito.
// Endpoint "client subscriptions": crea/aggiorna il profilo e lo iscrive alla lista
// rispettando l'impostazione single/double opt-in scelta in Klaviyo per quella lista.
const KLAVIYO_COMPANY_ID = "TeQntk"; // Public API Key (Settings → API keys)
const KLAVIYO_LIST_ID = "SkCyFQ"; // Lista "Lead sito web"
const KLAVIYO_REVISION = "2024-10-15";

type StatusKind = "info" | "ok" | "error";

function initLeadForms() {
  const forms = document.querySelectorAll<HTMLFormElement>("form[data-lead-form]");

  forms.forEach((form) => {
    const statusEl = form.querySelector<HTMLElement>("[data-lead-status]");
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    const setStatus = (msg: string, kind: StatusKind) => {
      if (!statusEl) return;
      statusEl.hidden = false;
      statusEl.textContent = msg;
      statusEl.dataset.kind = kind;
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Honeypot anti-bot: se il campo nascosto è compilato, è un bot → esci in silenzio.
      const honeypot = form.querySelector<HTMLInputElement>('input[name="company_website"]');
      if (honeypot && honeypot.value.trim() !== "") {
        form.reset();
        return;
      }

      const data = new FormData(form);
      const email = String(data.get("email") || "").trim();
      if (!email) {
        setStatus("Inserisci un'email valida.", "error");
        return;
      }

      const nome = String(data.get("nome") || "").trim();
      const azienda = String(data.get("azienda") || "").trim();
      const area = String(data.get("area") || data.get("oggetto") || "").trim();
      const messaggio = String(data.get("messaggio") || "").trim();

      // Consenso marketing esplicito (facoltativo): decide se iscrivere alla lista
      // (con consenso marketing) o solo salvare il profilo del lead.
      const marketingEl = form.querySelector<HTMLInputElement>('input[name="marketing"]');
      const marketingConsent = !!marketingEl?.checked;

      const properties: Record<string, string> = {
        Origine: "Form sito iCura",
        Pagina: location.pathname,
        "Consenso marketing": marketingConsent ? "Sì" : "No",
      };
      if (area) properties["Area di interesse"] = area;
      if (messaggio) properties["Messaggio"] = messaggio;

      const profileAttributes: Record<string, unknown> = { email, properties };
      if (nome) profileAttributes["first_name"] = nome;
      if (azienda) profileAttributes["organization"] = azienda;

      // Con consenso marketing → iscrizione alla lista (registra il consenso email
      // marketing su Klaviyo). Senza → upsert del solo profilo (lead salvato, non iscritto).
      const endpoint = marketingConsent
        ? `https://a.klaviyo.com/client/subscriptions/?company_id=${KLAVIYO_COMPANY_ID}`
        : `https://a.klaviyo.com/client/profiles/?company_id=${KLAVIYO_COMPANY_ID}`;

      const payload = marketingConsent
        ? {
            data: {
              type: "subscription",
              attributes: {
                custom_source: "Form sito iCura",
                profile: {
                  data: { type: "profile", attributes: profileAttributes },
                },
              },
              relationships: {
                list: { data: { type: "list", id: KLAVIYO_LIST_ID } },
              },
            },
          }
        : {
            data: { type: "profile", attributes: profileAttributes },
          };

      if (submitBtn) submitBtn.disabled = true;
      setStatus("Invio in corso…", "info");

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            revision: KLAVIYO_REVISION,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          // Sostituisce il form con il pannello di ringraziamento.
          const nameEl = form.querySelector<HTMLElement>("[data-thanks-name]");
          if (nameEl) nameEl.textContent = nome ? `, ${nome.split(" ")[0]}` : "";
          if (statusEl) statusEl.hidden = true;
          form.classList.add("is-sent");
          const successEl = form.querySelector<HTMLElement>("[data-lead-success]");
          if (successEl) {
            successEl.setAttribute("tabindex", "-1");
            successEl.focus();
          }
        } else {
          throw new Error("HTTP " + res.status);
        }
      } catch (err) {
        setStatus(
          "Non siamo riusciti a inviare la richiesta. Riprova tra poco o scrivici a info@icuraimpresa.it.",
          "error",
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}

if (document.readyState !== "loading") initLeadForms();
else document.addEventListener("DOMContentLoaded", initLeadForms);
