import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL("../", import.meta.url));
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const cmsUrl = "https://rudelbar-cms.christopher-harms.workers.dev/";

const result = spawnSync(process.execPath, [vite, "build", "--outDir", "dist/production"], {
  cwd: appDirectory,
  env: {
    ...process.env,
    VITE_SANITY_PROJECT_ID: "uywmld5e",
    VITE_SANITY_DATASET: "production",
    RUDELBAR_CMS_URL: cmsUrl,
  },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

await writeFile(new URL("../dist/production/CNAME", import.meta.url), "rudelbar.de\n");
console.log("Produktions-Build vorbereitet: dist/production (noch nicht veröffentlicht).");
