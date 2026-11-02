import test from "node:test";
import assert from "node:assert/strict";
import worker, { passwordVerifier } from "../worker.mjs";
import { getVisitorExperience } from '../lib/abend-service.mjs';
import {createContentClient} from '../lib/content-client.mjs';
import { DEFAULT_CATALOG, defaultExperience, experienceId, CATALOG_ID } from '../../shared/experience.mjs';

const origin = "https://rudelbar-cms-staging.example.workers.dev";
const secret = "a-local-test-session-secret-with-more-than-32-characters";
const password = "A-long-test-password-2026!";

async function setup({websiteDataset}={}) {
  const docs = new Map([[`drafts.${CATALOG_ID}`,{_id:`drafts.${CATALOG_ID}`,_type:"rudelAppCatalog",_rev:"initial-catalog",...structuredClone(DEFAULT_CATALOG)}]]);
  const websiteDocs=websiteDataset?new Map():docs;
  const calls = [];
  const env = {
    SANITY_PROJECT_ID: "project123",
    SANITY_DATASET: "staging",
    ...(websiteDataset?{SANITY_WEBSITE_DATASET:websiteDataset}:{}),
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
    const dataset=parsed.pathname.split('/').at(-1),store=dataset===websiteDataset?websiteDocs:docs;
    if (parsed.pathname.includes("/data/query/")) {
      const query = parsed.searchParams.get("query");
      const result = query.includes("_type")
        ? [...store.values()].filter(doc => doc._type === JSON.parse(parsed.searchParams.get("$type")))
        : store.get(JSON.parse(parsed.searchParams.get("$id"))) || null;
      return Response.json({ result });
    }
    if (parsed.pathname.includes("/data/mutate/")) {
      const { mutations } = JSON.parse(options.body);
      for (const mutation of mutations) {
        if (mutation.createOrReplace) store.set(mutation.createOrReplace._id, {...mutation.createOrReplace,_rev:crypto.randomUUID()});
        if (mutation.createIfNotExists&&!store.has(mutation.createIfNotExists._id))store.set(mutation.createIfNotExists._id,{...mutation.createIfNotExists,_rev:crypto.randomUUID()});
        if (mutation.patch){const old=store.get(mutation.patch.id);if(mutation.patch.ifRevisionID&&old?._rev!==mutation.patch.ifRevisionID)return Response.json({error:{description:'Revision conflict'}},{status:409});store.set(mutation.patch.id,{...old,...mutation.patch.set,_rev:crypto.randomUUID()});}
        if (mutation.delete) store.delete(mutation.delete.id);
      }
      return Response.json({ results: [] });
    }
    if (parsed.pathname.includes("/assets/images/")) {
      return Response.json({ document: { _id: "image-test-100x100-png", url: `https://cdn.sanity.io/images/project123/${dataset}/test.png` } });
    }
    throw new Error(`Unexpected Sanity endpoint: ${parsed.pathname}`);
  };
  return { docs, websiteDocs, calls, env, restore: () => { globalThis.fetch = originalFetch; } };
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

test('evening planning requires login and CSRF, keeps drafts separate, and publishes a resource snapshot',async()=>{
  const state=await setup();
  try{
    assert.equal((await worker.fetch(request('/api/abend/catalog'),state.env)).status,401);
    assert.equal(state.calls.length,0);
    const {cookie,csrf}=await login(state.env);
    const write=(path,body,method='PUT')=>worker.fetch(request(path,{method,cookie,csrf,body}),state.env);
    const read=async path=>(await worker.fetch(request(path,{cookie}),state.env)).json();
    assert.equal((await worker.fetch(request('/api/abend/catalog',{method:'PUT',cookie,body:DEFAULT_CATALOG}),state.env)).status,403);
    assert.equal((await write('/api/abend/catalog',{...DEFAULT_CATALOG,revision:state.docs.get(`drafts.${CATALOG_ID}`)._rev})).status,200);
    assert.ok(state.docs.has(`drafts.${CATALOG_ID}`));
    const id='planning-test',documentId=experienceId(id);
    state.docs.set(`drafts.${id}`,{_id:`drafts.${id}`,_type:'rudelEvent',title:'Testabend',date:'2026-11-01',venue:'Scharnebeck',time:'18 Uhr'});
    const draft=defaultExperience(id);draft.equipment=[{id:'kicker-1',place:'Links',host:'Martin'},{id:'kicker-2',place:'Rechts',host:'Nora'}];draft.menu=[{id:'wasser',priceCents:175}];
    assert.equal((await write(`/api/abend/events/${id}`,draft)).status,200);
    assert.equal((await read(`/api/abend/events/${id}`)).draft,true);
    assert.equal(state.docs.has(documentId),false);
    assert.equal((await write(`/api/abend/events/${id}/publish`,undefined,'POST')).status,409);
    assert.equal((await write(`/api/events/${id}/publish`,undefined,'POST')).status,200);
    assert.equal((await write(`/api/abend/events/${id}/publish`,undefined,'POST')).status,200);
    assert.equal(state.docs.has(documentId),false);
    assert.equal(state.docs.get(`drafts.rudel-app-release-${id}`).config.equipment.length,2);
    const changed=structuredClone(DEFAULT_CATALOG);changed.drinks[0].priceCents=900;
    assert.equal((await write('/api/abend/catalog',{...changed,revision:state.docs.get(`drafts.${CATALOG_ID}`)._rev})).status,200);
    assert.equal(state.docs.get(`drafts.rudel-app-release-${id}`).config.menu[0].priceCents,175);
    draft.welcomeTitle='Noch geheimer Entwurf';
    assert.equal((await write(`/api/abend/events/${id}`,draft)).status,200);
    assert.notEqual(state.docs.get(`drafts.rudel-app-release-${id}`).config.welcomeTitle,draft.welcomeTitle);
    assert.equal((await read(`/api/abend/events/${id}/preview`)).experience.welcomeTitle,draft.welcomeTitle);
    assert.equal((await write(`/api/abend/events/${id}/unpublish`,undefined,'POST')).status,200);
    assert.equal(state.docs.has(documentId),false);
    assert.equal(state.docs.get(`drafts.${documentId}`).welcomeTitle,draft.welcomeTitle);
    assert.equal((await write('/api/abend/events/missing',draft)).status,404);
  }finally{state.restore();}
});


test('private app events stay out of the public calendar and require their guest link',async()=>{
  const state=await setup();
  try{
    const {cookie,csrf}=await login(state.env);
    const write=(path,body,method='POST')=>worker.fetch(request(path,{method,cookie,csrf,body}),state.env);
    const create=await write('/api/abend/events',{title:'Privater Geburtstag',date:'2026-11-07',time:'18 Uhr',venue:'Privater Garten',visibility:'private',teamIds:[]});
    assert.equal(create.status,201);const {id}=await create.json();
    const list=await(await worker.fetch(request('/api/abend/events',{cookie}),state.env)).json();
    const event=list.events.find(e=>e.eventId===id);assert.equal(event.app.state,'closed');assert.ok(event.guestUrl.includes('zugang='));
    assert.equal([...state.docs.values()].filter(d=>d._type==='rudelEvent').length,0);
    assert.ok([...state.docs.keys()].every(key=>key.startsWith('drafts.')));
    assert.equal((await getVisitorExperience({list:async type=>[...state.docs.values()].filter(d=>d._type===type).map(d=>({...d,_id:d._id.slice(7),draft:true,published:false})),getDocument:async id=>state.docs.get(id)}, {eventId:id})).status,404);
    const {createSanity}=await import('../lib/sanity.mjs');const client=createSanity({projectId:'project123',dataset:'staging',token:'private-test-token'});
    assert.equal((await getVisitorExperience(client,{eventId:id,accessCode:'wrong'})).status,404);
    const closed=await getVisitorExperience(client,{eventId:id,accessCode:event.accessCode});assert.equal(closed.state,'closed');assert.equal(closed.experience,null);
    assert.equal((await getVisitorExperience(client)).status,404);
    assert.equal((await write('/api/abend/events',{title:'Invalid',date:'2026-13-01',venue:'Ort',visibility:'private',teamIds:[]})).status,400);
  }finally{state.restore();}
});

test('opening, applying content and closing are separate, durable operations with optional profile assignments',async()=>{
  const state=await setup();
  try{
    const {cookie,csrf}=await login(state.env);
    const call=async(path,body,method='POST')=>{const r=await worker.fetch(request(path,{method,cookie,csrf,body}),state.env);assert.equal(r.status<300,true,await r.clone().text());return r.json();};
    const {id}=await call('/api/abend/events',{title:'Eigenständiger Abend',date:'2026-11-07',venue:'Scharnebeck',visibility:'public',teamIds:[]});
    const {person}=await call('/api/abend/people',{name:'Alex',role:'Spiele',email:'internal-only@example.test',phone:'+49 123 456'});
    let event=(await call(`/api/abend/events/${id}`,undefined,'GET')).event;
    await call(`/api/abend/events/${id}/details`,{...event,teamIds:[person.personId]},'PUT');
    let config=defaultExperience(id);config.welcomeTitle='Erste Fassung';config.equipment=[{id:'kicker-1',place:'Neben dem Wagen',hostId:person.personId}];
    config=(await call(`/api/abend/events/${id}`,config,'PUT')).experience;
    await call(`/api/abend/events/${id}/publish`);
    const {createSanity}=await import('../lib/sanity.mjs');const client=createSanity({projectId:'project123',dataset:'staging',token:'private-test-token'});
    assert.equal((await getVisitorExperience(client,{eventId:id})).state,'closed','applying content must not open the app');
    assert.equal((await getVisitorExperience(client)).state,'closed','the root guest link also displays the closed state');
    await call(`/api/abend/events/${id}/open`);
    let guest=await getVisitorExperience(client,{eventId:id});assert.equal(guest.state,'open');assert.equal(guest.experience.equipment[0].host,'Alex');
    assert.ok(!JSON.stringify(guest).includes('internal-only'));assert.ok(!JSON.stringify(guest).includes('+49 123'));assert.ok(!JSON.stringify(guest).includes('accessCode'));
    await call('/api/abend/people/'+person.personId,{...person,name:'Alex Neu'},'PUT');
    assert.equal((await getVisitorExperience(client,{eventId:id})).experience.equipment[0].host,'Alex Neu','a profile reference resolves the current profile rather than a stored free-text name');
    config=(await call(`/api/abend/events/${id}`,{...config,welcomeTitle:'Nächster Entwurf'},'PUT')).experience;
    assert.equal((await getVisitorExperience(client,{eventId:id})).experience.welcomeTitle,'Erste Fassung');
    assert.equal((await call(`/api/abend/events/${id}/preview`,undefined,'GET')).experience.welcomeTitle,'Nächster Entwurf');
    await call(`/api/abend/events/${id}/publish`);assert.equal((await getVisitorExperience(client,{eventId:id})).experience.welcomeTitle,'Nächster Entwurf');
    await call(`/api/abend/events/${id}/close`);assert.equal((await getVisitorExperience(client,{eventId:id})).experience,null);
    await call(`/api/abend/events/${id}/publish`);assert.equal((await getVisitorExperience(client,{eventId:id})).state,'closed');
    assert.equal(state.docs.has(experienceId(id)),false,'no public Sanity copy is created');
    assert.equal([...state.docs.values()].filter(d=>d._type==='rudelEvent').length,0);
    assert.equal((await call(`/api/abend/events/${id}`,undefined,'GET')).event.app.hasDraft,false);
  }finally{state.restore();}
});

test('profile references are optional, must belong to the event team, and reject stale edits',async()=>{
  const state=await setup();
  try{
    const {cookie,csrf}=await login(state.env);
    const write=(path,body,method='POST')=>worker.fetch(request(path,{method,cookie,csrf,body}),state.env);
    const {id}=await(await write('/api/abend/events',{title:'Test',date:'2026-11-07',venue:'Ort',visibility:'public',teamIds:[]})).json();
    const {person}=await(await write('/api/abend/people',{name:'Alex'})).json();
    assert.equal((await write('/api/events/'+person.personId+'/publish')).status,404,'website publication routes cannot publish private profile documents');
    assert.equal((await write('/api/events/rudel-app-event-'+id+'/publish')).status,404);
    assert.equal(state.docs.has(person.personId),false);
    const config=defaultExperience(id);config.games=[{id:'kniffel',hostId:person.personId}];
    assert.equal((await write(`/api/abend/events/${id}`,config,'PUT')).status,400);
    config.games[0].hostId='';config.games[0].host='Free text must not be stored';
    const saved=await(await write(`/api/abend/events/${id}`,config,'PUT')).json();assert.equal(saved.experience.games[0].hostId,'');assert.equal(saved.experience.games[0].host,undefined);
    const updated=await write('/api/abend/people/'+person.personId,{...person,name:'New name'},'PUT');assert.equal(updated.status,200);
    assert.equal((await write('/api/abend/people/'+person.personId,{...person,name:'Stale name'},'PUT')).status,409);
    const newer=await write(`/api/abend/events/${id}`,{...saved.experience,welcomeTitle:'New'},'PUT');assert.equal(newer.status,200);
    assert.equal((await write(`/api/abend/events/${id}`,{...saved.experience,welcomeTitle:'Stale'},'PUT')).status,409);
    assert.equal((await worker.fetch(request('/api/abend/people'),state.env)).status,401);
    assert.ok([...state.docs.keys()].every(key=>key.startsWith('drafts.')));
  }finally{state.restore();}
});

test('profile and offer deletion routes require session and CSRF, protect revisions and support restoration',async()=>{
 const state=await setup();try{
  const {cookie,csrf}=await login(state.env),call=(path,body,method='POST',token=csrf)=>worker.fetch(request(path,{method,cookie,csrf:token,body}),state.env);
  const offer='/api/abend/catalog/equipment/kicker-1';
  assert.equal((await call(offer+'/delete',{revision:'initial-catalog'},'POST','wrong')).status,403);
  let response=await call(offer+'/delete',{revision:'initial-catalog'});assert.equal(response.status,200);let catalog=(await response.json()).catalog;assert.ok(catalog.equipment.find(r=>r.id==='kicker-1').deletedAt);
  assert.equal((await call('/api/abend/catalog',{...DEFAULT_CATALOG,revision:'initial-catalog'},'PUT')).status,409,'a stale full-catalog edit cannot resurrect a deleted offer');
  response=await call(offer+'/restore',{revision:catalog.revision});assert.equal(response.status,200);catalog=(await response.json()).catalog;assert.ok(!catalog.equipment.find(r=>r.id==='kicker-1').deletedAt);
  const person=(await(await call('/api/abend/people',{name:'Lokale Prüfperson'})).json()).person,path='/api/abend/people/'+person.personId;
  assert.equal((await call(path+'/delete',{revision:person.revision},'POST','wrong')).status,403);
  assert.equal((await call(path+'/delete',{revision:person.revision})).status,200);
  let people=await(await worker.fetch(request('/api/abend/people',{cookie}),state.env)).json();assert.equal(people.people.length,0);assert.equal(people.trash.length,1);
  assert.equal((await call(path,{...person,name:'Cannot edit trash'},'PUT')).status,409);
  assert.equal((await call(path+'/restore',{revision:people.trash[0].revision})).status,200);
  people=await(await worker.fetch(request('/api/abend/people',{cookie}),state.env)).json();assert.equal(people.people.length,1);assert.equal(people.people[0].archived,true);assert.equal(people.trash.length,0);
 }finally{state.restore();}
});

test('a post-only author can write only their own drafts, cannot publish, and cannot enter other Backstage data',async()=>{
 const state=await setup({websiteDataset:'production'});const {sqliteD1}=await import('./sqlite-d1.mjs'),{readFile}=await import('node:fs/promises'),{createAccounts}=await import('../lib/accounts.mjs'),{createSanity}=await import('../lib/sanity.mjs'),{peopleFor,eventList}=await import('../lib/abend-service.mjs');
 const db=sqliteD1();state.env.LIVE_DB=db;
 for(const name of ['0001_live_stations','0002_notifications','0003_accounts','0004_native_accounts','0005_member_onboarding'])db.connection.exec(await readFile(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8'));
 try{
  state.docs.set('drafts.person-writer',{_id:'drafts.person-writer',_type:'rudelAppPerson',_rev:'person-revision',personId:'person-writer',name:'Prüfautor',archived:false});
  const client=createSanity({projectId:'project123',dataset:'staging',token:'private-test-token'}),accounts=createAccounts(state.env,{people:()=>peopleFor(client),events:()=>eventList(client)}),actor={name:'Redaktion'},a=(await accounts.save(actor,{personId:'person-writer',email:'writer@example.invalid',roles:[{role:'author'}]})).account;
  const invitation=await accounts.invite(actor,a.id),personalPassword='Local-only-writer-password!';await accounts.complete({token:invitation.token,password:personalPassword});
  const response=await worker.fetch(request('/api/login',{method:'POST',body:{email:a.email,password:personalPassword}}),state.env),cookie=response.headers.getSetCookie().find(v=>v.startsWith('rb_account='));assert.equal(response.status,200);
  const user=(await(await worker.fetch(request('/api/session',{cookie}),state.env)).json()).user;assert.equal(user.role,'writer');
  const call=(path,body,method=body?'POST':'GET')=>worker.fetch(request(path,{method,cookie,csrf:user.csrf,body}),state.env),post={title:'Eigener Beitrag',date:'2026-11-01',teaser:'Ein lokaler Entwurf.',body:'Ein vollständiger lokaler Prüfbeitrag.',images:[]};
  const own=(await(await call('/api/posts',post)).json()).id;assert.ok(own);
  state.websiteDocs.set('drafts.foreign-post',{_id:'drafts.foreign-post',_type:'rudelPost',...post,title:'Fremder Beitrag'});
  const list=await(await call('/api/posts')).json();assert.equal(list.items.length,1);assert.equal(list.items[0]._id,own);
  assert.equal((await call('/api/posts/'+own,{...post,title:'Überarbeitet'},'PUT')).status,200);
  assert.equal((await call('/api/posts/foreign-post',post,'PUT')).status,403);
  assert.equal((await call('/api/posts/'+own+'/publish',{})).status,403);
  assert.equal((await call('/api/upload/app',{})).status,403,'post authors cannot write assets into the app dataset');
  for(const path of ['/api/events','/api/team','/api/accounts','/api/abend/events','/api/abend/catalog','/api/abend/people','/api/abend/partners'])assert.equal((await call(path)).status,403,path);
  const legacy=await login(state.env);assert.equal((await worker.fetch(request('/api/posts/'+own+'/publish',{method:'POST',cookie:legacy.cookie,csrf:legacy.csrf,body:{}}),state.env)).status,200);
  assert.ok(!JSON.stringify(state.websiteDocs.get(own)).includes(a.id),'internal account ownership is not copied into the public Sanity post');
  assert.equal(state.docs.has(own),false,'website drafts never enter the app dataset');
 }finally{db.connection.close();state.restore();}
});

test('both website editors share production reads, drafts, publishing and images while app records stay in place',async()=>{
 const state=await setup({websiteDataset:'production'});try{
  const post={_id:'shared-post',_type:'rudelPost',title:'Vorhandener Produktionsbeitrag',date:'2026-10-08',teaser:'Vorhandener Kurztext',body:'Vorhandener Text',images:[]};
  const event={_id:'shared-event',_type:'rudelEvent',title:'Produktiver Termin',date:'2026-11-02',time:'18 Uhr',venue:'Scharnebeck',description:'Ein Abend',order:1};
  state.websiteDocs.set(post._id,post);state.websiteDocs.set(event._id,event);state.websiteDocs.set('shared-team',{_id:'shared-team',_type:'rudelTeamMember',name:'Echtes Website-Team'});
  state.docs.set(post._id,{...post,title:'Veralteter Arbeitsstand'});state.docs.set(event._id,{...event,title:'Veralteter Termin'});
  const {cookie,csrf}=await login(state.env),read=async path=>await(await worker.fetch(request(path,{cookie}),state.env)).json(),write=(path,body,method='POST')=>worker.fetch(request(path,{method,cookie,csrf,body}),state.env);
  assert.equal((await read('/api/posts')).items[0].title,post.title);
  assert.equal((await read('/api/events')).items[0].title,event.title);
  assert.equal((await read('/api/team')).items[0].name,'Echtes Website-Team');
  assert.equal((await read('/api/abend/events')).events[0].title,event.title,'preparation imports the same production event');
  assert.equal((await write('/api/posts/shared-post',{...post,title:'Überarbeiteter Entwurf'},'PUT')).status,200);
  assert.equal(state.websiteDocs.get('drafts.shared-post').title,'Überarbeiteter Entwurf');
  assert.equal(state.websiteDocs.get('shared-post').title,post.title,'saving a draft does not publish');
  assert.equal(state.docs.get('shared-post').title,'Veralteter Arbeitsstand');
  assert.equal((await write('/api/posts/shared-post/publish',{})).status,200);
  assert.equal(state.websiteDocs.get('shared-post').title,'Überarbeiteter Entwurf');
  const person=await write('/api/abend/people',{name:'Ansprechpartner'});assert.equal(person.status,201);assert.equal([...state.websiteDocs.values()].some(d=>d._type==='rudelAppPerson'),false);
  for(const [path,dataset] of [['/api/upload','production'],['/api/upload/app','staging']]){
   const response=await worker.fetch(new Request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'image/png','X-File-Name':'bild.png'},body:new Uint8Array([137,80,78,71])}),state.env);
   assert.equal(response.status,200);assert.match((await response.json()).url,new RegExp('/'+dataset+'/'));
  }
  assert.equal((await worker.fetch(request('/api/posts'),state.env)).status,401);
 }finally{state.restore();}
});

test('guest entry uses production event metadata with existing app release, people and configuration',async()=>{
 const state=await setup({websiteDataset:'production'});try{
  const eventId='public-evening';state.websiteDocs.set(eventId,{_id:eventId,_type:'rudelEvent',title:'Aktueller öffentlicher Abend',date:'2026-11-02',time:'18 Uhr',venue:'Scharnebeck'});
  state.docs.set(eventId,{_id:eventId,_type:'rudelEvent',title:'Veralteter öffentlicher Abend'});
  state.docs.set('drafts.rudel-app-release-'+eventId,{_id:'drafts.rudel-app-release-'+eventId,_type:'rudelAppRelease',eventId,state:'open',config:defaultExperience(eventId)});
  const result=await getVisitorExperience(createContentClient(state.env),{eventId});
  assert.equal(result.status,200);assert.equal(result.state,'open');assert.equal(result.experience.event.title,'Aktueller öffentlicher Abend');
  assert.ok(state.calls.filter(c=>c.url.includes('/data/query/production')).every(c=>new URL(c.url).searchParams.get('$type')==='"rudelEvent"'),'only website event metadata comes from production in a guest read');
  assert.equal(state.calls.some(c=>c.url.includes('/data/mutate/')),false);
 }finally{state.restore();}
});
