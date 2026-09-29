import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const built = (path) => new URL(`../dist/client/${path}`, import.meta.url);

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

test("build does not claim the production domain", async () => {
  await assert.rejects(access(built("CNAME")));
  const index = await readFile(built("index.html"), "utf8");
  assert.match(index, /Impressum/);
  assert.match(index, /datenschutz\.html/);
  assert.match(index, /\.\/assets\/rudelbar-logo\.png/);
});
