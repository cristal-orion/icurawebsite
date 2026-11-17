import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://www.icuraimpresa.it",
  // Il sito resta statico; solo le pagine con `prerender = false` (area analizzatore DVR:
  // registrazione, accesso, area riservata) girano sul server Node dietro nginx.
  output: "static",
  adapter: node({ mode: "standalone" }),
  // Il controllo d'origine lo facciamo noi (src/lib/dvr/auth.ts): dietro Coolify → nginx
  // il protocollo visto da Node è http e quello di Astro rifiuterebbe i POST in https.
  security: { checkOrigin: false },
  trailingSlash: "ignore",
  build: {
    inlineStylesheets: "auto",
  },
  integrations: [
    sitemap({
      // Fuori dall'indice: dashboard interna e bozze di proposte.
      filter: (page) =>
        !page.includes("/lavora-con-noi/admin") &&
        !page.includes("/proposte"),
    }),
  ],
});
