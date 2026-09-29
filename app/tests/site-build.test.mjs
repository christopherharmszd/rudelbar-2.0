import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const production = process.env.RUDELBAR_BUILD_TARGET === "production";
const built = (path) => new URL(`../dist/${production ? "production" : "client"}/${path}`, import.meta.url);

test("build contains the public pages and brand assets", async () => {
  for (const path of [
    "index.html",
    "impressum.html",
    "datenschutz.html",
    "assets/rudelbar-logo.png",
    "assets/team-martin.png",
    "assets/team-jan.png",
    "assets/team-jannik.png",
    "assets/team-paddy.png",
    "assets/team-patryk-portrait-v1.png",
  ]) {
    await access(built(path));
  }
});

test("build targets the selected website and editorial server", async () => {
  if (production) {
    assert.equal(await readFile(built("CNAME"), "utf8"), "rudelbar.de\n");
    const redirect = await readFile(built("redaktion/index.html"), "utf8");
    assert.match(redirect, /rudelbar-cms\.christopher-harms\.workers\.dev/);
    assert.doesNotMatch(redirect, /rudelbar-cms-staging/);
  } else {
    await assert.rejects(access(built("CNAME")));
  }
  const index = await readFile(built("index.html"), "utf8");
  assert.match(index, /\.\/assets\/rudelbar-logo\.png/);
  const scripts = (await readdir(built("assets"))).filter(file => /^index-.*\.js$/.test(file));
  if (production) {
    const bundle = await readFile(built(`assets/${scripts[0]}`), "utf8");
    assert.match(bundle, /VITE_SANITY_DATASET:"production",VITE_SANITY_PROJECT_ID:"uywmld5e"/);
    assert.doesNotMatch(bundle, /VITE_SANITY_DATASET:"staging"/);
  }
  assert.equal(scripts.length, 1);
  const app = await readFile(built(`assets/${scripts[0]}`), "utf8");
  for (const text of ["Impressum", "datenschutz.html", "www.instagram.com/rudelbar/", "Aktuelles"]) assert.ok(app.includes(text));
});
