import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.icuraimpresa.it",
  output: "static",
  trailingSlash: "ignore",
  build: {
    inlineStylesheets: "auto",
  },
});
