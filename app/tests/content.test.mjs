import assert from "node:assert/strict";
import test from "node:test";
import { nextEvent, orderedContent, upcomingEvents } from "../src/content.js";

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
