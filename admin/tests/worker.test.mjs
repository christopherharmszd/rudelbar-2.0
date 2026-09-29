import test from "node:test";
import assert from "node:assert/strict";
import worker, { passwordVerifier } from "../worker.mjs";

const origin = "https://rudelbar-cms-staging.example.workers.dev";
const secret = "a-local-test-session-secret-with-more-than-32-characters";
const password = "A-long-test-password-2026!";

async function setup() {
  const docs = new Map();
  const calls = [];
  const env = {
    SANITY_PROJECT_ID: "project123",
    SANITY_DATASET: "staging",
    SANITY_EDITOR_TOKEN: "private-test-token",
    RUDELBAR_SESSION_SECRET: secret,
    RUDELBAR_PASSWORD_VERIFIER: await passwordVerifier(secret, password),
    LOGIN_LIMITER: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("static asset") },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    assert.equal(options.headers.Authorization, "Bearer private-test-token");
    const parsed = new URL(url);
    if (parsed.pathname.includes("/data/query/")) {
      const query = parsed.searchParams.get("query");
      const result = query.includes("_type")
        ? [...docs.values()].filter(doc => doc._type === JSON.parse(parsed.searchParams.get("$type")))
        : docs.get(JSON.parse(parsed.searchParams.get("$id"))) || null;
      return Response.json({ result });
    }
    if (parsed.pathname.includes("/data/mutate/")) {
      const { mutations } = JSON.parse(options.body);
      for (const mutation of mutations) {
        if (mutation.createOrReplace) docs.set(mutation.createOrReplace._id, mutation.createOrReplace);
        if (mutation.delete) docs.delete(mutation.delete.id);
      }
      return Response.json({ results: [] });
    }
    if (parsed.pathname.includes("/assets/images/")) {
      return Response.json({ document: { _id: "image-test-100x100-png", url: "https://cdn.sanity.io/images/project123/staging/test.png" } });
    }
    throw new Error(`Unexpected Sanity endpoint: ${parsed.pathname}`);
  };
  return { docs, calls, env, restore: () => { globalThis.fetch = originalFetch; } };
}

function request(path, { method = "GET", cookie, csrf, body, contentType = "application/json", originHeader = origin } = {}) {
  return new Request(`${origin}${path}`, {
    method,
    headers: {
      ...(originHeader ? { Origin: originHeader } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...(body ? { "Content-Type": contentType } : {}),
    },
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
}

async function login(env) {
  const response = await worker.fetch(request("/api/login", { method: "POST", body: {
    email: "redaktion@rudelbar.local", password,
  } }), env);
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const session = await worker.fetch(request("/api/session", { cookie }), env);
  const data = await session.json();
  assert.equal(data.user.role, "publisher");
  return { cookie, csrf: data.user.csrf };
}

test("online login protects Sanity writes and revokes sessions when the password changes", async () => {
  const state = await setup();
  try {
    const anonymous = await worker.fetch(request("/api/events"), state.env);
    assert.equal(anonymous.status, 401);
    const wrong = await worker.fetch(request("/api/login", { method: "POST", body: {
      email: "redaktion@rudelbar.local", password: "wrong",
    } }), state.env);
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers.get("set-cookie"), null);
    const { cookie, csrf } = await login(state.env);
    const crossSite = await worker.fetch(request("/api/events", { method: "POST", cookie, csrf,
      originHeader: "https://example.org", body: {} }), state.env);
    assert.equal(crossSite.status, 403);
    const noCsrf = await worker.fetch(request("/api/events", { method: "POST", cookie, body: {} }), state.env);
    assert.equal(noCsrf.status, 403);

    const image = await worker.fetch(new Request(`${origin}/api/upload`, { method: "POST", headers: {
      Origin: origin, Cookie: cookie, "X-CSRF-Token": csrf, "Content-Type": "image/png", "X-File-Name": "team.png",
    }, body: new Uint8Array([137, 80, 78, 71]) }), state.env);
    assert.equal(image.status, 200);
    assert.equal((await image.json()).assetId, "image-test-100x100-png");

    const created = await worker.fetch(request("/api/events", { method: "POST", cookie, csrf, body: {
      title: "Rudelabend", date: "2026-10-17", time: "19 Uhr", venue: "Scharnebeck",
      address: "Hauptstraße 1", description: "Gemeinsam draußen sitzen", order: "1",
    } }), state.env);
    assert.equal(created.status, 201);
    const { id } = await created.json();
    assert.equal(state.docs.get(`drafts.${id}`).title, "Rudelabend");

    const published = await worker.fetch(request(`/api/events/${id}/publish`, { method: "POST", cookie, csrf }), state.env);
    assert.equal(published.status, 200);
    assert.equal(state.docs.get(id).date, "2026-10-17");
    const list = await worker.fetch(request("/api/events", { cookie }), state.env);
    assert.equal((await list.json()).items[0].published, true);
    const unpublished = await worker.fetch(request(`/api/events/${id}/unpublish`, { method: "POST", cookie, csrf }), state.env);
    assert.equal(unpublished.status, 200);
    assert.equal(state.docs.has(id), false);
    assert.equal(state.docs.has(`drafts.${id}`), true);

    const teamCreated = await worker.fetch(request("/api/team", { method: "POST", cookie, csrf, body: {
      name: "Pat", role: "Organisation", bio: "Teil des Rudels", order: "2",
      photoAssetId: "image-test-100x100-png", photoUrl: "https://cdn.sanity.io/images/project123/staging/test.png",
    } }), state.env);
    assert.equal(teamCreated.status, 201);
    const { id: teamId } = await teamCreated.json();
    assert.equal(state.docs.get(`drafts.${teamId}`).photo.asset._ref, "image-test-100x100-png");
    assert.equal((await worker.fetch(request(`/api/team/${teamId}/publish`, { method: "POST", cookie, csrf }), state.env)).status, 200);
    assert.equal((await (await worker.fetch(request("/api/team", { cookie }), state.env)).json()).items[0].published, true);

    const postCreated = await worker.fetch(request("/api/posts", { method: "POST", cookie, csrf, body: {
      title: "Ein Abend im Rudel", date: "2026-09-29", teaser: "Ein kurzer Einblick",
      body: "Erster Absatz.\n\nZweiter Absatz.", images: [{
        assetId: "image-test-100x100-png", url: "https://cdn.sanity.io/images/project123/staging/test.png",
        alt: "Rudelbar am Abend", caption: "Ein guter Abend",
      }],
    } }), state.env);
    assert.equal(postCreated.status, 201);
    const { id: postId } = await postCreated.json();
    assert.equal(state.docs.get(`drafts.${postId}`).images[0].alt, "Rudelbar am Abend");
    assert.equal((await worker.fetch(request(`/api/posts/${postId}/publish`, { method: "POST", cookie, csrf }), state.env)).status, 200);
    assert.equal((await (await worker.fetch(request("/api/posts", { cookie }), state.env)).json()).items[0].published, true);
    assert.equal((await worker.fetch(request(`/api/posts/${postId}/unpublish`, { method: "POST", cookie, csrf }), state.env)).status, 200);
    assert.equal(state.docs.has(postId), false);
    const fallbackPost = await worker.fetch(request("/api/posts", { method: "POST", cookie, csrf, body: {
      title: "Ohne Bildbeschreibung", date: "2026-09-29", teaser: "Ein Blick", body: "Text", images: [
        { assetId: "image-test-100x100-png", url: "https://cdn.sanity.io/images/project123/staging/test.png", alt: "", caption: "Erstes Bild" },
        { assetId: "image-test-100x100-png", url: "https://cdn.sanity.io/images/project123/staging/test.png", alt: "Eigene Beschreibung", caption: "Zweites Bild" },
      ],
    } }), state.env);
    assert.equal(fallbackPost.status, 201);
    const { id: fallbackId } = await fallbackPost.json();
    assert.deepEqual(state.docs.get(`drafts.${fallbackId}`).images.map(image => [image.alt, image.caption]), [
      ["Ein Blick", "Erstes Bild"], ["Eigene Beschreibung", "Zweites Bild"],
    ]);
    const reorderedPost = await worker.fetch(request(`/api/posts/${fallbackId}`, { method: "PUT", cookie, csrf, body: {
      title: "Ohne Bildbeschreibung", date: "2026-09-29", teaser: "Ein Blick", body: "Text", images: [
        { assetId: "image-test-100x100-png", url: "https://cdn.sanity.io/images/project123/staging/test.png", alt: "Eigene Beschreibung", caption: "Zweites Bild" },
        { assetId: "image-test-100x100-png", url: "https://cdn.sanity.io/images/project123/staging/test.png", alt: "", caption: "Erstes Bild" },
      ],
    } }), state.env);
    assert.equal(reorderedPost.status, 200);
    assert.deepEqual(state.docs.get(`drafts.${fallbackId}`).images.map(image => [image.alt, image.caption]), [
      ["Eigene Beschreibung", "Zweites Bild"], ["Ein Blick", "Erstes Bild"],
    ]);

    state.env.RUDELBAR_PASSWORD_VERIFIER = await passwordVerifier(secret, "A-new-test-password-2026!");
    const expired = await worker.fetch(request("/api/session", { cookie }), state.env);
    assert.equal((await expired.json()).user, null);
    assert.ok(state.calls.length > 0);
  } finally {
    state.restore();
  }
});

test("events and posts move through archive, restore, and final deletion", async () => {
  const state = await setup();
  try {
    const { cookie, csrf } = await login(state.env);
    const write = (path, method = "POST", body) => worker.fetch(request(path, { method, cookie, csrf, body }), state.env);
    const read = path => worker.fetch(request(path, { cookie }), state.env);
    const event = await write("/api/events", "POST", {
      title: "Testtermin", date: "2026-10-17", time: "19 Uhr", venue: "Scharnebeck",
      address: "Hauptstraße 1", description: "Ein Testtermin", order: 1,
    });
    assert.equal(event.status, 201);
    const { id } = await event.json();
    assert.equal((await write(`/api/events/${id}/publish`)).status, 200);
    assert.equal((await write(`/api/events/${id}/delete`)).status, 409);
    assert.equal((await write(`/api/events/${id}/archive`)).status, 200);
    assert.equal(state.docs.has(id), false);
    assert.equal(state.docs.get(`drafts.${id}`).archived, true);
    assert.equal((await (await read("/api/events")).json()).items[0].archived, true);
    assert.equal((await write(`/api/events/${id}/publish`)).status, 409);
    assert.equal((await write(`/api/events/${id}`, "PUT", {
      title: "Versehentlich bearbeitet", date: "2026-10-17", time: "19 Uhr",
      venue: "Scharnebeck", description: "Ein Testtermin", order: 1,
    })).status, 409);
    assert.equal((await write(`/api/events/${id}/restore`)).status, 200);
    assert.equal(state.docs.get(`drafts.${id}`).archived, undefined);
    assert.equal(state.docs.has(id), false);
    assert.equal((await write(`/api/events/${id}/publish`)).status, 200);
    assert.equal(state.docs.has(id), true);
    assert.equal((await write(`/api/events/${id}/archive`)).status, 200);
    assert.equal((await write(`/api/events/${id}/delete`)).status, 200);
    assert.equal(state.docs.has(id), false);
    assert.equal(state.docs.has(`drafts.${id}`), false);
    assert.equal((await (await read("/api/events")).json()).items.length, 0);
    assert.equal((await write(`/api/events/${id}`, "PUT", {
      title: "Alter Tab", date: "2026-10-17", time: "19 Uhr",
      venue: "Scharnebeck", description: "Ein Testtermin", order: 1,
    })).status, 404);

    const post = await write("/api/posts", "POST", {
      title: "Testbeitrag", date: "2026-09-29", teaser: "Ein Einblick", body: "Testtext", images: [],
    });
    assert.equal(post.status, 201);
    const { id: postId } = await post.json();
    assert.equal((await write(`/api/posts/${postId}/publish`)).status, 200);
    assert.equal((await write(`/api/posts/${postId}/archive`)).status, 200);
    assert.equal(state.docs.has(postId), false);
    assert.equal((await (await read("/api/posts")).json()).items[0].archived, true);
    assert.equal((await write(`/api/posts/${postId}/delete`)).status, 200);
    assert.equal(state.docs.has(`drafts.${postId}`), false);
    assert.equal((await write(`/api/team/${postId}/archive`)).status, 404);
  } finally {
    state.restore();
  }
});

test("login throttling runs before checking passwords", async () => {
  const state = await setup();
  try {
    state.env.LOGIN_LIMITER.limit = async () => ({ success: false });
    const response = await worker.fetch(request("/api/login", { method: "POST", body: {
      email: "redaktion@rudelbar.local", password,
    } }), state.env);
    assert.equal(response.status, 429);
    assert.equal(state.calls.length, 0);
  } finally {
    state.restore();
  }
});
