import assert from "node:assert/strict";
import test from "node:test";
import { loadPublishedContent, newestPosts, nextEvent, orderedContent, upcomingEvents } from "../src/content.js";

test("homepage chooses the next date, independent of editorial list order", () => {
  const events = [
    { _id: "later", date: "2026-10-20", order: 0 },
    { _id: "past", date: "2026-09-01", order: 1 },
    { _id: "next", date: "2026-10-02", order: 9 },
  ];
  assert.equal(nextEvent(events, "2026-09-28")._id, "next");
  assert.deepEqual(orderedContent(upcomingEvents(events, "2026-09-28")).map(event => event._id), ["later", "next"]);
  assert.equal(nextEvent(events, "2026-10-21"), null);
});

test("posts stay absent before publication and published posts sort newest first", async () => {
  const preview = await loadPublishedContent(null);
  assert.deepEqual(preview.posts, []);
  assert.deepEqual(newestPosts([{ _id: "old", date: "2026-09-01" }, { _id: "new", date: "2026-09-29" }]).map(post => post._id), ["new", "old"]);
});

test("public content requests published posts alongside events and team", async () => {
  const originalFetch = globalThis.fetch;
  const types = [];
  globalThis.fetch = async url => {
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("perspective"), "published");
    const type = parsed.searchParams.get("query").match(/"([^"]+)"/)[1];
    types.push(type);
    return Response.json({ result: type === "rudelPost" ? [{ _id: "one", title: "Rudelabend", date: "2026-09-29" }] : [] });
  };
  try {
    const content = await loadPublishedContent({ projectId: "project123", dataset: "staging" });
    assert.deepEqual(types.sort(), ["rudelEvent", "rudelPost", "rudelTeamMember"].sort());
    assert.equal(content.posts[0].title, "Rudelabend");
  } finally { globalThis.fetch = originalFetch; }
});
