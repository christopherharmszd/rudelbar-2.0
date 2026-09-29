import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const stagingCmsUrl = "https://rudelbar-cms-staging.christopher-harms.workers.dev/";

function editorRedirect(url) {
  const target = new URL(url);
  if (target.protocol !== "https:" || target.username || target.password || target.hash) {
    throw new Error("RUDELBAR_CMS_URL muss eine HTTPS-Adresse ohne Zugangsdaten oder Fragment sein.");
  }
  const safeUrl = target.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="referrer" content="no-referrer" />
    <meta http-equiv="refresh" content="0; url=${safeUrl}" />
    <title>Rudelbar Redaktion öffnen</title>
  </head>
  <body>
    <p>Die Rudelbar Redaktion wird geöffnet. <a href="${safeUrl}">Redaktion direkt öffnen</a></p>
  </body>
</html>`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const dataset = env.VITE_SANITY_DATASET || "staging";
  const cmsUrl = env.RUDELBAR_CMS_URL || (dataset === "staging" ? stagingCmsUrl : "");
  if (!cmsUrl) throw new Error("Für den Produktions-Build muss RUDELBAR_CMS_URL gesetzt sein.");
  if (dataset === "production" && cmsUrl === stagingCmsUrl) {
    throw new Error("Der Produktions-Build darf nicht zur Staging-Redaktion weiterleiten.");
  }
  const redirectPage = editorRedirect(cmsUrl);

  return {
    base: "./",
    build: {
      outDir: "dist/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    plugins: [react(), {
      name: "rudelbar-editor-short-url",
      apply: "build",
      generateBundle() {
        for (const fileName of ["redaktion.html", "redaktion/index.html"]) {
          this.emitFile({ type: "asset", fileName, source: redirectPage });
        }
      },
    }],
  };
});
