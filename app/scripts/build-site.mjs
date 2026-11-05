import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const production = process.argv.includes("--production");
const target = production ? "production" : "client";
const siteUrl = production ? "https://rudelbar.de/" : "https://christopherharmszd.github.io/rudelbar-2.0/";
const out = resolve(root, "dist", target);
const environment = { ...process.env, VITE_SANITY_PROJECT_ID: "uywmld5e", VITE_SANITY_DATASET: production ? "production" : "staging", VITE_SITE_URL: siteUrl, RUDELBAR_CMS_URL: "https://rudelbar-cms-staging.christopher-harms.workers.dev/backstage#website" };
const vite = resolve(root, "node_modules/vite/bin/vite.js");
for (const args of [["build", "--outDir", `dist/${target}`], ["build", "--ssr", "src/entry-server.jsx", "--outDir", "dist/server", "--emptyOutDir"]]) {
  const result = spawnSync(process.execPath, [vite, ...args], { cwd: root, env: environment, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

async function published(type) {
  const url = new URL(`https://uywmld5e.api.sanity.io/v2025-02-19/data/query/${environment.VITE_SANITY_DATASET}`);
  url.searchParams.set("perspective", "published");
  url.searchParams.set("query", `*[_type == "${type}" && archived != true]`);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Sanity ${type}: HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.result)) throw new Error(`Sanity ${type}: invalid response`);
      return data.result;
    } catch (error) { if (attempt === 2) throw error; }
  }
}
const [events, team, posts] = await Promise.all([published("rudelEvent"), published("rudelTeamMember"), published("rudelPost")]);
const content = { events, team, posts, preview: false };
const escape = value => String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const json = value => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const slug = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
const itemSlug = item => /^[a-z0-9-]{1,220}$/.test(item.slug || "") ? item.slug : `${slug(item.title) || "rudelabend"}-${item._id}`;
const pathFor = path => new URL(path, siteUrl).pathname;
const pages = ["", "termine/", "das-rudel/", "dein-event/", "kontakt/", "datenschutz/", "impressum/", ...(posts.length ? ["aktuelles/"] : []), ...posts.map(item => `aktuelles/${itemSlug(item)}/`), ...events.map(item => `termine/${itemSlug(item)}/`)];

// All social-card layout is deterministic, using the unchanged supplied logo.
const assets = resolve(out, "assets");
const logoPath = resolve(root, "public/assets/rudelbar-logo.png");
const logo = await sharp(logoPath).resize(420, 420, { fit: "contain" }).png().toBuffer();
const card = Buffer.from('<svg width="1200" height="630"><rect width="1200" height="630" fill="#0d0d0d"/><rect x="35" y="35" width="1130" height="560" rx="8" fill="none" stroke="#d39a22" stroke-width="2"/><text x="600" y="525" text-anchor="middle" font-family="sans-serif" font-size="29" font-weight="600" fill="#f5f1e9">DIE MOBILE KNEIPE</text><text x="600" y="568" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#d9bd7a">Gemeinsam. Überall. Rudelbar.</text></svg>');
await sharp(card).composite([{ input: logo, left: 390, top: 58 }]).jpeg({ quality: 90, mozjpeg: true }).toFile(resolve(assets, "rudelbar-share.jpg"));
for (const size of [32, 180, 192]) await sharp(logoPath).resize(size, size, { fit: "contain", background: "#0d0d0d" }).flatten({ background: "#0d0d0d" }).png().toFile(resolve(assets, `favicon-${size}.png`));
for (const width of [48, 96, 192, 256, 384, 512]) await sharp(logoPath).resize(width).webp({ quality: 88 }).toFile(resolve(assets, `rudelbar-logo-${width}.webp`));
const mediaNames = (await readdir(resolve(root, "public/assets"))).filter(name => /^(?:village-route-map|rudelbar-abend|rudelbar-wagen)(?:-(?:black|dusk|evening))?\.(?:png|jpe?g)$/.test(name));
for (const name of mediaNames) {
  const stem = name.replace(/\.[^.]+$/, "");
  await Promise.all([320, 640, 960, 1440].map(width => sharp(resolve(root, "public/assets", name)).resize({ width }).webp({ quality: 82 }).toFile(resolve(assets, `${stem}-${width}.webp`))));
}

const template = await readFile(resolve(out, "index.html"), "utf8");
const { render } = await import(pathToFileURL(resolve(root, "dist/server/entry-server.js")).href);
async function page(pathname, file, noindex = false) {
  const result = render(pathname, content), meta = result.metadata;
  const head = `<title>${escape(meta.title)}</title>\n<meta name="description" content="${escape(meta.description)}">\n<meta name="robots" content="${!production || noindex || meta.missing ? "noindex, follow" : "index, follow"}">\n<link rel="canonical" href="${escape(meta.canonical)}">\n<meta property="og:site_name" content="Rudel Bar">\n<meta property="og:locale" content="de_DE">\n<meta property="og:type" content="${escape(meta.type)}">\n<meta property="og:title" content="${escape(meta.title)}">\n<meta property="og:description" content="${escape(meta.description)}">\n<meta property="og:url" content="${escape(meta.canonical)}">\n<meta property="og:image" content="${escape(meta.image)}">\n<meta property="og:image:alt" content="${meta.type === "article" ? escape(meta.title) : "Rudelbar Logo auf schwarzem Hintergrund"}">\n${meta.type === "website" ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : ''}\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${escape(meta.title)}">\n<meta name="twitter:description" content="${escape(meta.description)}">\n<meta name="twitter:image" content="${escape(meta.image)}">\n<link rel="icon" type="image/png" sizes="32x32" href="${pathFor("assets/favicon-32.png")}">\n<link rel="icon" type="image/png" sizes="192x192" href="${pathFor("assets/favicon-192.png")}">\n<link rel="apple-touch-icon" sizes="180x180" href="${pathFor("assets/favicon-180.png")}">\n<script type="application/ld+json">${json(meta.jsonld)}</script>`;
  const output = template.replace(/<html lang="de">/, '<html lang="de" data-theme="black">').replace(/<title>.*?<\/title>/s, head).replace(/\s*<link rel="icon"[^>]*>/, "").replace('<div id="root"></div>', `<div id="root">${result.html}</div>\n<script>window.__RUDELBAR_CONTENT__=${json(content)};</script>`);
  const destination = resolve(out, file); await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, output);
}
for (const path of pages) await page(pathFor(path), path ? `${path}index.html` : "index.html");
for (const name of ["impressum", "datenschutz"]) await page(pathFor(`${name}.html`), `${name}.html`);
await page(pathFor("404.html"), "404.html", true);
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(path => `<url><loc>${escape(new URL(path, siteUrl).href)}</loc></url>`).join("\n")+'\n</urlset>\n';
await writeFile(resolve(out, "sitemap.xml"), sitemap);
await writeFile(resolve(out, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap.xml", siteUrl).href}\n`);
await writeFile(resolve(out, ".nojekyll"), "");
await writeFile(resolve(out, "site-manifest.json"), json({ source: process.env.RUDELBAR_SOURCE_SHA || "local", dataset: environment.VITE_SANITY_DATASET, pages, revisions: [...events, ...team, ...posts].map(({ _id, _rev }) => ({ id: _id, revision: _rev })) }));
if (production) await writeFile(resolve(out, "CNAME"), "rudelbar.de\n");
console.log(`Built ${pages.length} public pages from ${environment.VITE_SANITY_DATASET}; ${production ? "indexable production" : "noindex staging"}.`);
