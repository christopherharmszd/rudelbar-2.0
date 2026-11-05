import test from "node:test";
import assert from "node:assert/strict";
import { createSanity } from "../lib/sanity.mjs";

test("published website URLs survive title edits and draft saves", async () => {
  const original = globalThis.fetch;
  const docs = new Map([["post-1", {_id:"post-1",_type:"rudelPost",title:"Alter Titel",slug:"alter-titel-post-1"}]]);
  globalThis.fetch = async (input, options={}) => {
    const url = new URL(input);
    if (url.pathname.includes("/data/query/")) return Response.json({result:docs.get(JSON.parse(url.searchParams.get("$id"))) || null});
    for (const mutation of JSON.parse(options.body).mutations) {
      if (mutation.createOrReplace) docs.set(mutation.createOrReplace._id,mutation.createOrReplace);
      if (mutation.delete) docs.delete(mutation.delete.id);
    }
    return Response.json({});
  };
  try {
    const client=createSanity({projectId:"test",dataset:"production",token:"test-only"});
    await client.saveDraft("rudelPost","post-1",{title:"Neuer Titel"},true);
    assert.equal(docs.get("drafts.post-1").slug,"alter-titel-post-1");
    await client.publish("post-1");
    assert.equal(docs.get("post-1").slug,"alter-titel-post-1");
    docs.set("drafts.event-1",{_id:"drafts.event-1",_type:"rudelEvent",title:"Schöner Abend"});
    await client.publish("event-1");
    assert.equal(docs.get("event-1").slug,"schoner-abend-event-1");
  } finally { globalThis.fetch=original; }
});

