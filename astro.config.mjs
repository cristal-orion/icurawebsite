import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://www.icuraimpresa.it",
  output: "static",
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
