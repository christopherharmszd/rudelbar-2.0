import http from "node:http";
import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID, scryptSync, createHmac, timingSafeEqual } from "node:crypto";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createSanity } from "./lib/sanity.mjs";
import { events, team } from "./lib/seed.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "public");
const assetDir = resolve(here, "../app/public/assets");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const configured = Boolean(process.env.SANITY_PROJECT_ID && process.env.SANITY_DATASET && process.env.SANITY_EDITOR_TOKEN);
const secret = process.env.RUDELBAR_SESSION_SECRET || "";
let users = [];
try { users = JSON.parse(process.env.RUDELBAR_USERS_JSON || "[]"); } catch { throw new Error("RUDELBAR_USERS_JSON ist kein gültiges JSON."); }
if (configured && (secret.length < 32 || !users.length)) throw new Error("Für den Schreibbetrieb fehlen Nutzer oder ein Session-Schlüssel mit mindestens 32 Zeichen.");
if (!configured && !["127.0.0.1", "localhost", "::1"].includes(host)) throw new Error("Die unverknüpfte Vorschau darf nur lokal gestartet werden.");
const sanity = configured ? createSanity({ projectId: process.env.SANITY_PROJECT_ID, dataset: process.env.SANITY_DATASET, token: process.env.SANITY_EDITOR_TOKEN }) : null;
const loginAttempts = new Map();

function reply(res, status, data, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
  res.end(JSON.stringify(data));
}
function cookies(req) { return Object.fromEntries((req.headers.cookie || "").split(";").map(x => x.trim().split("=")).filter(x => x.length === 2)); }
function sign(payload) { const body = Buffer.from(JSON.stringify(payload)).toString("base64url"); return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`; }
function session(req) {
  const raw = cookies(req).rb_session || "";
  const [body, mac] = raw.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  let actual; try { actual = Buffer.from(mac, "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  let value; try { value = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
  if (value.exp < Date.now()) return null;
  const user = users.find(x => x.email === value.sub && x.role === value.role);
  return user ? value : null;
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
function authorized(req, res, role = "editor") {
  const user = session(req);
  if (!user) { reply(res, 401, { error: "Bitte anmelden." }); return null; }
  if (!sameOrigin(req) || req.headers["x-csrf-token"] !== user.csrf) { reply(res, 403, { error: "Ungültige Sicherheitsprüfung." }); return null; }
  if (role === "publisher" && user.role !== "publisher") { reply(res, 403, { error: "Nur Personen mit Veröffentlichungsrecht dürfen das tun." }); return null; }
  return user;
}
async function body(req, limit = 1_000_000) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw Object.assign(new Error("Datei oder Eingabe ist zu groß."), { status: 413 }); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function clean(value, max, required = false) {
  const result = String(value || "").trim();
  if ((required && !result) || result.length > max) throw Object.assign(new Error(`Eingabe fehlt oder ist zu lang (maximal ${max} Zeichen).`), { status: 400 });
  return result;
}
function fields(type, data) {
  if (type === "posts") {
    const date = clean(data.date, 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) throw Object.assign(new Error("Bitte ein gültiges Beitragsdatum eingeben."), { status: 400 });
    if (!Array.isArray(data.images) || data.images.length > 12) throw Object.assign(new Error("Maximal 12 Bilder pro Beitrag sind möglich."), { status: 400 });
    const images = data.images.map(image => {
      const assetId = clean(image.assetId, 200, true);
      const url = clean(image.url, 1000, true);
      if (!/^image-[a-zA-Z0-9-]+$/.test(assetId) || !/^https:\/\/cdn\.sanity\.io\/images\//.test(url)) throw Object.assign(new Error("Ungültiges Beitragsbild."), { status: 400 });
      return { _key: randomUUID(), _type: "image", asset: { _type: "reference", _ref: assetId }, url,
        alt: clean(image.alt, 180, true), caption: clean(image.caption, 240) };
    });
    return { title: clean(data.title, 120, true), date, teaser: clean(data.teaser, 300, true), body: clean(data.body, 12000, true), images };
  }
  const order = Number(data.order ?? 0);
  if (!Number.isInteger(order) || order < 0 || order > 999) throw Object.assign(new Error("Ungültige Reihenfolge."), { status: 400 });
  if (type === "events") {
    const date = clean(data.date, 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) throw Object.assign(new Error("Bitte ein gültiges Datum eingeben."), { status: 400 });
    const mapUrl = clean(data.mapUrl, 1000);
    if (mapUrl && !/^https:\/\//i.test(mapUrl)) throw Object.assign(new Error("Der Routenlink muss mit https:// beginnen."), { status: 400 });
    return { title: clean(data.title, 120, true), date, time: clean(data.time, 80, true), venue: clean(data.venue, 160, true), address: clean(data.address, 240), description: clean(data.description, 1200, true), mapUrl, order };
  }
  const photoAssetId = clean(data.photoAssetId, 200);
  if (photoAssetId && !/^image-[a-zA-Z0-9-]+$/.test(photoAssetId)) throw Object.assign(new Error("Ungültiges Bild."), { status: 400 });
  const photoUrl = clean(data.photoUrl, 1000);
  if (photoUrl && !/^https:\/\/cdn\.sanity\.io\/images\//.test(photoUrl)) throw Object.assign(new Error("Ungültige Bildadresse."), { status: 400 });
  return { name: clean(data.name, 80, true), role: clean(data.role, 160, true), bio: clean(data.bio, 1200, true), order, ...(photoAssetId ? { photo: { _type: "image", asset: { _type: "reference", _ref: photoAssetId } }, photoUrl } : {}) };
}
function typeFromPath(value) { return { events: "rudelEvent", team: "rudelTeamMember", posts: "rudelPost" }[value] || null; }
function safeId(id) { return /^[a-z0-9-]{1,100}$/i.test(id); }

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  if (path.startsWith("/api/")) {
    if (req.method === "GET" && path === "/api/session") {
      const user = configured ? session(req) : null;
      return reply(res, 200, { configured, user: user ? { email: user.sub, role: user.role, csrf: user.csrf } : null });
    }
    if (req.method === "POST" && path === "/api/login") {
      if (!configured) return reply(res, 503, { error: "Sanity ist noch nicht verbunden." });
      if (!sameOrigin(req)) return reply(res, 403, { error: "Ungültige Herkunft." });
      const data = JSON.parse((await body(req)).toString());
      const email = clean(data.email, 200).toLowerCase();
      const key = `${req.socket.remoteAddress}:${email}`;
      const attempt = loginAttempts.get(key) || { count: 0, until: Date.now() + 900000 };
      if (attempt.until < Date.now()) { attempt.count = 0; attempt.until = Date.now() + 900000; }
      if (attempt.count >= 5) return reply(res, 429, { error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." });
      const user = users.find(x => x.email === email);
      const [salt, hash] = String(user?.passwordHash || "").split(":");
      let valid = false;
      if (salt && hash) { const candidate = scryptSync(String(data.password || ""), salt, 64); const expected = Buffer.from(hash, "hex"); valid = candidate.length === expected.length && timingSafeEqual(candidate, expected); }
      if (!valid) { attempt.count++; loginAttempts.set(key, attempt); return reply(res, 401, { error: "E-Mail oder Passwort stimmt nicht." }); }
      loginAttempts.delete(key);
      const token = sign({ sub: user.email, role: user.role, csrf: randomBytes(24).toString("base64url"), exp: Date.now() + 8 * 3600000 });
      return reply(res, 200, { ok: true }, { "Set-Cookie": `rb_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === "production" || req.socket.encrypted ? "; Secure" : ""}` });
    }
    if (req.method === "POST" && path === "/api/logout") {
      if (!authorized(req, res)) return;
      return reply(res, 200, { ok: true }, { "Set-Cookie": "rb_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
    }
    if (!configured && req.method === "GET" && path === "/api/events") return reply(res, 200, { items: events, preview: true });
    if (!configured && req.method === "GET" && path === "/api/team") return reply(res, 200, { items: team, preview: true });
    if (!configured && req.method === "GET" && path === "/api/posts") return reply(res, 200, { items: [], preview: true });
    if (!configured) return reply(res, 503, { error: "Nur Vorschau: Sanity und Anmeldung sind noch nicht eingerichtet." });
    if (req.method === "GET" && ["/api/events", "/api/team", "/api/posts"].includes(path)) {
      if (!session(req)) return reply(res, 401, { error: "Bitte anmelden." });
      return reply(res, 200, { items: await sanity.list(typeFromPath(path.split("/")[2])) });
    }
    if (req.method === "POST" && path === "/api/upload") {
      if (!authorized(req, res)) return;
      const mime = req.headers["content-type"];
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return reply(res, 400, { error: "Bitte JPG, PNG oder WebP hochladen." });
      const filename = clean(req.headers["x-file-name"], 160, true).replace(/[^a-z0-9._-]/gi, "-");
      const file = await body(req, 8_000_000);
      return reply(res, 200, await sanity.uploadImage(file, mime, filename));
    }
    const match = path.match(/^\/api\/(events|team|posts)(?:\/([a-z0-9-]+))?(?:\/(publish|unpublish))?$/i);
    if (match) {
      const [, group, id, action] = match;
      const type = typeFromPath(group);
      if (id && !safeId(id)) return reply(res, 400, { error: "Ungültige Kennung." });
      if (req.method === "POST" && !action && !id) {
        if (!authorized(req, res)) return;
        const data = JSON.parse((await body(req)).toString());
        const newId = randomUUID();
        await sanity.saveDraft(type, newId, fields(group, data));
        return reply(res, 201, { id: newId });
      }
      if (req.method === "PUT" && id && !action) {
        if (!authorized(req, res)) return;
        const data = JSON.parse((await body(req)).toString());
        await sanity.saveDraft(type, id, fields(group, data));
        return reply(res, 200, { id });
      }
      if (req.method === "POST" && id && action) {
        if (!authorized(req, res, "publisher")) return;
        if (action === "publish") await sanity.publish(id);
        else await sanity.unpublish(id);
        return reply(res, 200, { ok: true });
      }
    }
    return reply(res, 404, { error: "Nicht gefunden." });
  }
  let base = publicDir;
  let name = path === "/" ? "index.html" : decodeURIComponent(path.slice(1));
  if (path.startsWith("/seed-assets/")) { base = assetDir; name = decodeURIComponent(path.slice(13)); }
  const file = resolve(base, name);
  if (!file.startsWith(`${base}${sep}`)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(file);
    const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" }[extname(file)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": `${mime}; charset=utf-8`, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'self'; img-src 'self' https://cdn.sanity.io data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    res.end(data);
  } catch { res.writeHead(404); res.end("Nicht gefunden"); }
}

http.createServer((req, res) => Promise.resolve(handle(req, res)).catch(error => {
  console.error(error);
  if (!res.headersSent) reply(res, error.status || 500, { error: error.status ? error.message : "Die Anfrage konnte nicht abgeschlossen werden." });
})).listen(port, host, () => console.log(`Rudelbar Redaktion: http://${host}:${port} (${configured ? "Sanity verbunden" : "lokale Vorschau"})`));
