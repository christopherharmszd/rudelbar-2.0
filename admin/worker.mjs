import { createSanity } from "./lib/sanity.mjs";

const editorEmail = "redaktion@rudelbar.local";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function json(status, data, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
}

function base64url(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function equal(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

export async function passwordVerifier(secret, password) {
  return base64url(await hmac(secret, `rudelbar-password-v1:${password}`));
}

async function signSession(env, payload) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = base64url(await hmac(env.RUDELBAR_SESSION_SECRET, body));
  return `${body}.${signature}`;
}

function cookie(request) {
  const match = request.headers.get("cookie")?.match(/(?:^|;\s*)rb_session=([^;]+)/);
  return match?.[1] || "";
}

async function session(request, env) {
  const [body, signature, extra] = cookie(request).split(".");
  if (!body || !signature || extra || body.length > 2048) return null;
  const actual = fromBase64url(signature);
  const expected = await hmac(env.RUDELBAR_SESSION_SECRET, body);
  if (!equal(actual, expected)) return null;
  try {
    const value = JSON.parse(decoder.decode(fromBase64url(body)));
    if (value.sub !== editorEmail || value.exp <= Date.now() || value.exp > Date.now() + 8 * 3600000 ||
        value.ver !== env.RUDELBAR_PASSWORD_VERIFIER || !/^[A-Za-z0-9_-]{32}$/.test(value.csrf)) return null;
    return value;
  } catch {
    return null;
  }
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

async function authorized(request, env) {
  const user = await session(request, env);
  if (!user) return { error: json(401, { error: "Bitte anmelden." }) };
  if (!sameOrigin(request) || request.headers.get("x-csrf-token") !== user.csrf) {
    return { error: json(403, { error: "Ungültige Sicherheitsprüfung." }) };
  }
  return { user };
}

function clean(value, max, required = false) {
  const result = String(value || "").trim();
  if ((required && !result) || result.length > max) throw Object.assign(new Error(`Eingabe fehlt oder ist zu lang (maximal ${max} Zeichen).`), { status: 400 });
  return result;
}

function sanity(env) {
  return createSanity({ projectId: env.SANITY_PROJECT_ID, dataset: env.SANITY_DATASET, token: env.SANITY_EDITOR_TOKEN });
}

function fields(type, data) {
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
  return { name: clean(data.name, 80, true), role: clean(data.role, 160, true), bio: clean(data.bio, 1200, true), order,
    ...(photoAssetId ? { photo: { _type: "image", asset: { _type: "reference", _ref: photoAssetId } }, photoUrl } : {}) };
}

async function body(request, limit = 1_000_000) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit) throw Object.assign(new Error("Datei oder Eingabe ist zu groß."), { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > limit) throw Object.assign(new Error("Datei oder Eingabe ist zu groß."), { status: 413 });
  return bytes;
}

async function data(request) {
  try { return JSON.parse(decoder.decode(await body(request))); }
  catch (error) { if (error.status) throw error; throw Object.assign(new Error("Ungültige Eingabe."), { status: 400 }); }
}

async function api(request, env) {
  const path = new URL(request.url).pathname;
  if (!env.SANITY_PROJECT_ID || !env.SANITY_DATASET || !env.SANITY_EDITOR_TOKEN ||
      !env.RUDELBAR_SESSION_SECRET || env.RUDELBAR_SESSION_SECRET.length < 32 || !env.RUDELBAR_PASSWORD_VERIFIER) {
    return json(503, { error: "Die Redaktion ist noch nicht vollständig eingerichtet." });
  }
  if (request.method === "GET" && path === "/api/session") {
    const user = await session(request, env);
    return json(200, { configured: true, user: user ? { email: user.sub, role: "publisher", csrf: user.csrf } : null });
  }
  if (request.method === "POST" && path === "/api/login") {
    if (!sameOrigin(request)) return json(403, { error: "Ungültige Herkunft." });
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const rate = await env.LOGIN_LIMITER.limit({ key: ip });
    if (!rate.success) return json(429, { error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." });
    const input = await data(request);
    const candidate = await passwordVerifier(env.RUDELBAR_SESSION_SECRET, String(input.password || ""));
    const valid = String(input.email || "").trim().toLowerCase() === editorEmail &&
      equal(fromBase64url(candidate), fromBase64url(env.RUDELBAR_PASSWORD_VERIFIER));
    if (!valid) return json(401, { error: "E-Mail oder Passwort stimmt nicht." });
    const csrf = base64url(crypto.getRandomValues(new Uint8Array(24)));
    const token = await signSession(env, { sub: editorEmail, csrf, ver: env.RUDELBAR_PASSWORD_VERIFIER, exp: Date.now() + 8 * 3600000 });
    return json(200, { ok: true }, { "Set-Cookie": `rb_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800` });
  }
  if (request.method === "POST" && path === "/api/logout") {
    const auth = await authorized(request, env);
    if (auth.error) return auth.error;
    return json(200, { ok: true }, { "Set-Cookie": "rb_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" });
  }
  if (request.method === "GET" && ["/api/events", "/api/team"].includes(path)) {
    const user = await session(request, env);
    if (!user) return json(401, { error: "Bitte anmelden." });
    return json(200, { items: await sanity(env).list(path === "/api/events" ? "rudelEvent" : "rudelTeamMember") });
  }
  if (request.method === "POST" && path === "/api/upload") {
    const auth = await authorized(request, env);
    if (auth.error) return auth.error;
    const mime = request.headers.get("content-type");
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return json(400, { error: "Bitte JPG, PNG oder WebP hochladen." });
    const filename = clean(request.headers.get("x-file-name"), 160, true).replace(/[^a-z0-9._-]/gi, "-");
    const file = await body(request, 8_000_000);
    return json(200, await sanity(env).uploadImage(file, mime, filename));
  }
  const match = path.match(/^\/api\/(events|team)(?:\/([a-z0-9-]+))?(?:\/(publish|unpublish))?$/i);
  if (match) {
    const auth = await authorized(request, env);
    if (auth.error) return auth.error;
    const [, group, id, action] = match;
    const type = group === "events" ? "rudelEvent" : "rudelTeamMember";
    const client = sanity(env);
    if (request.method === "POST" && !id && !action) {
      const newId = crypto.randomUUID();
      await client.saveDraft(type, newId, fields(group, await data(request)));
      return json(201, { id: newId });
    }
    if (request.method === "PUT" && id && !action) {
      await client.saveDraft(type, id, fields(group, await data(request)));
      return json(200, { id });
    }
    if (request.method === "POST" && id && action) {
      if (action === "publish") await client.publish(id);
      else await client.unpublish(id);
      return json(200, { ok: true });
    }
  }
  return json(404, { error: "Nicht gefunden." });
}

export default {
  async fetch(request, env) {
    if (!new URL(request.url).pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try { return await api(request, env); }
    catch (error) {
      console.error("Redaktionsanfrage fehlgeschlagen", error);
      return json(error.status || 500, { error: error.status ? error.message : "Die Anfrage konnte nicht abgeschlossen werden." });
    }
  },
};
