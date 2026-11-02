import {wallApi} from './lib/wall-api.mjs';
import { createContentClient } from "./lib/content-client.mjs";
import {liveApi} from "./lib/live-api.mjs";
import { experienceApi } from "./lib/experience-api.mjs";
import {createAccounts,cookieValue,accountCookie} from './lib/accounts.mjs';
import {passwordApi} from './lib/password-api.mjs';
import {accountsApi} from './lib/accounts-api.mjs';
import {peopleFor,eventList} from './lib/abend-service.mjs';
import {publicUser,editsContent,writesPosts,requirePermission} from './lib/permissions.mjs';
import {mediaApi} from './lib/media-api.mjs';

const editorEmail = "redaktion@rudelbar.local";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function json(status, data, headers = {}) {
  const output=new Headers(headers);output.set('Cache-Control','no-store');output.set('X-Content-Type-Options','nosniff');output.set('Referrer-Policy','no-referrer');
  return Response.json(data,{status,headers:output});
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
  if(cookieValue(request,'rb_account'))return accountsFor(env).session(request);
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
  if (!sameOrigin(request)) return { error: json(403, { error: "Ungültige Sicherheitsprüfung.", code:"invalid_origin" }) };
  if (request.headers.get("x-csrf-token") !== user.csrf) {
    return { error: json(403, { error: "Ungültige Sicherheitsprüfung.", code:"csrf_stale" }) };
  }
  return { user };
}

function clean(value, max, required = false) {
  const result = String(value || "").trim();
  if ((required && !result) || result.length > max) throw Object.assign(new Error(`Eingabe fehlt oder ist zu lang (maximal ${max} Zeichen).`), { status: 400 });
  return result;
}

function sanity(env) {
  return createContentClient(env);
}
function accountsFor(env){const client=sanity(env);return createAccounts(env,{people:()=>peopleFor(client),events:()=>eventList(client)});}

function fields(type, data) {
  if (type === "posts") {
    const date = clean(data.date, 10, true);
    const teaser = clean(data.teaser, 300, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) throw Object.assign(new Error("Bitte ein gültiges Beitragsdatum eingeben."), { status: 400 });
    if (!Array.isArray(data.images) || data.images.length > 12) throw Object.assign(new Error("Maximal 12 Bilder pro Beitrag sind möglich."), { status: 400 });
    const images = data.images.map(image => {
      const assetId = clean(image.assetId, 200, true);
      const url = clean(image.url, 1000, true);
      if (!/^image-[a-zA-Z0-9-]+$/.test(assetId) || !/^https:\/\/cdn\.sanity\.io\/images\//.test(url)) throw Object.assign(new Error("Ungültiges Beitragsbild."), { status: 400 });
      return {
        _key: crypto.randomUUID(), _type: "image", asset: { _type: "reference", _ref: assetId },
        url, alt: clean(image.alt, 300) || teaser, caption: clean(image.caption, 240),
      };
    });
    return { title: clean(data.title, 120, true), date, teaser, body: clean(data.body, 12000, true), images };
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
  try { return JSON.parse(decoder.decode(await body(request,/\/api\/abend\/(?:catalog|resources)\/csv/.test(new URL(request.url).pathname)?2_100_000:1_000_000))); }
  catch (error) { if (error.status) throw error; throw Object.assign(new Error("Ungültige Eingabe."), { status: 400 }); }
}

async function api(request, env, execution) {
  const path = new URL(request.url).pathname;
  if (!env.SANITY_PROJECT_ID || !env.SANITY_DATASET || !env.SANITY_EDITOR_TOKEN ||
      !env.RUDELBAR_SESSION_SECRET || env.RUDELBAR_SESSION_SECRET.length < 32 || !env.RUDELBAR_PASSWORD_VERIFIER) {
    return json(503, { error: "Die Redaktion ist noch nicht vollständig eingerichtet." });
  }
  if (request.method === "GET" && path === "/api/session") {
    const user = await session(request, env);
    return json(200, { configured: true, user: publicUser(user) });
  }
  if(path.startsWith('/api/auth/'))return passwordApi(request,env,{accounts:accountsFor(env),json,data,session,authorized,defer:execution?.waitUntil?.bind(execution)});
  if(path.startsWith('/api/accounts'))return accountsApi(request,env,{accounts:accountsFor(env),json,session,authorized,data});
  if(path==='/api/media')return mediaApi(request,env,{client:sanity(env),json,session});
  if (request.method === "POST" && path === "/api/login") {
    if (!sameOrigin(request)) return json(403, { error: "Ungültige Herkunft." });
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const rate = await env.LOGIN_LIMITER.limit({ key: ip });
    if (!rate.success) return json(429, { error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." });
    const input = await data(request);
    if(String(input.email||'').trim().toLowerCase()!==editorEmail){
      const result=await accountsFor(env).signIn(input.email,input.password);
      const headers=new Headers({'Set-Cookie':accountCookie(result.token)});headers.append('Set-Cookie','rb_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
      return json(200,{ok:true},headers);
    }
    const candidate = await passwordVerifier(env.RUDELBAR_SESSION_SECRET, String(input.password || ""));
    const valid = String(input.email || "").trim().toLowerCase() === editorEmail &&
      equal(fromBase64url(candidate), fromBase64url(env.RUDELBAR_PASSWORD_VERIFIER));
    if (!valid) return json(401, { error: "E-Mail oder Passwort stimmt nicht." });
    const csrf = base64url(crypto.getRandomValues(new Uint8Array(24)));
    const token = await signSession(env, { sub: editorEmail, csrf, ver: env.RUDELBAR_PASSWORD_VERIFIER, exp: Date.now() + 8 * 3600000 });
    const headers=new Headers({"Set-Cookie":`rb_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`});headers.append('Set-Cookie',accountCookie('',0));
    return json(200, { ok: true }, headers);
  }
  if (request.method === "POST" && path === "/api/logout") {
    const auth = await authorized(request, env);
    if (auth.error) return auth.error;
    await accountsFor(env).logout(auth.user);
    const headers=new Headers({'Set-Cookie':'rb_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});headers.append('Set-Cookie',accountCookie('',0));
    return json(200, { ok: true }, headers);
  }
  if(path.startsWith('/api/wall/'))return wallApi(request,env,{client:sanity(env),session,authorized});
  if(path.startsWith('/api/live/'))return liveApi(request,env,{client:sanity(env),json,session,data,defer:execution?.waitUntil?.bind(execution)});
  if(path.startsWith('/api/abend/'))return experienceApi(request,env,{client:sanity(env),json,session,authorized,data});
  if (request.method === "GET" && ["/api/events", "/api/team", "/api/posts"].includes(path)) {
    const user = await session(request, env);
    if (!user) return json(401, { error: "Bitte anmelden." });
    requirePermission(path==='/api/posts'?writesPosts(user):editsContent(user));
    let items=await sanity(env).website.list({ "/api/events": "rudelEvent", "/api/team": "rudelTeamMember", "/api/posts": "rudelPost" }[path]);
    if(!editsContent(user)){const owned=new Set((await env.LIVE_DB.prepare('SELECT content_id FROM app_content_ownership WHERE owner_account_id=?').bind(user.accountId).all()).results.map(r=>r.content_id));items=items.filter(item=>owned.has(item._id));}
    return json(200, { items });
  }
  if (request.method === "POST" && ["/api/upload","/api/upload/app"].includes(path)) {
    const auth = await authorized(request, env);
    if (auth.error) return auth.error;
    requirePermission(path==='/api/upload/app'?editsContent(auth.user):writesPosts(auth.user));
    const mime = request.headers.get("content-type");
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return json(400, { error: "Bitte JPG, PNG oder WebP hochladen." });
    const filename = clean(request.headers.get("x-file-name"), 160, true).replace(/[^a-z0-9._-]/gi, "-");
    const file = await body(request, 8_000_000);
    const client=sanity(env);
    return json(200, await (path==='/api/upload/app'?client:client.website).uploadImage(file, mime, filename));
  }
  const match = path.match(/^\/api\/(events|team|posts)(?:\/([a-z0-9-]+))?(?:\/(publish|unpublish|archive|restore|delete))?$/i);
  if (match) {
    const auth = await authorized(request, env);
    if (auth.error) return auth.error;
    const [, group, id, action] = match;
    requirePermission(group==='posts'?writesPosts(auth.user):editsContent(auth.user));
    if(!editsContent(auth.user)){
      requirePermission(!action);
      if(id)requirePermission(!!await env.LIVE_DB.prepare('SELECT content_id FROM app_content_ownership WHERE content_id=? AND owner_account_id=?').bind(id,auth.user.accountId).first());
    }
    const type = { events: "rudelEvent", team: "rudelTeamMember", posts: "rudelPost" }[group];
    const client = sanity(env).website;
    if (request.method === "POST" && !id && !action) {
      const newId = crypto.randomUUID(),newFields=fields(group, await data(request));
      if(!editsContent(auth.user))await env.LIVE_DB.prepare('INSERT INTO app_content_ownership(content_id,owner_account_id,created_at) VALUES(?,?,?)').bind(newId,auth.user.accountId,Date.now()).run();
      await client.saveDraft(type, newId, newFields);
      return json(201, { id: newId });
    }
    if (request.method === "PUT" && id && !action) {
      await client.saveDraft(type, id, fields(group, await data(request)), true);
      return json(200, { id });
    }
    if (request.method === "POST" && id && action) {
      const candidate = await client.getDocument(`drafts.${id}`) || await client.getDocument(id);
      if (!candidate || candidate._type !== type) return json(404, { error: "Nicht gefunden." });
      if (["archive", "restore", "delete"].includes(action) && group === "team") return json(404, { error: "Nicht gefunden." });
      if (action === "publish") await client.publish(id);
      else if (action === "unpublish") await client.unpublish(id);
      else if (action === "archive") await client.archive(id, type);
      else if (action === "restore") await client.restore(id, type);
      else await client.deleteForever(id, type);
      return json(200, { ok: true });
    }
  }
  return json(404, { error: "Nicht gefunden." });
}

export default {
  async fetch(request, env, execution) {
    if (!new URL(request.url).pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try { return await api(request, env, execution); }
    catch (error) {
      console.error("Redaktionsanfrage fehlgeschlagen", error);
      return json(error.status || 500, { error: error.status ? error.message : "Die Anfrage konnte nicht abgeschlossen werden." });
    }
  },
};
