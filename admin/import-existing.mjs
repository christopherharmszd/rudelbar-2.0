import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSanity } from "./lib/sanity.mjs";
import { events, team } from "./lib/seed.mjs";

const { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_EDITOR_TOKEN } = process.env;
if (!SANITY_PROJECT_ID || !SANITY_DATASET || !SANITY_EDITOR_TOKEN) throw new Error("Sanity-Zugang fehlt.");
const sanity = createSanity({ projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET, token: SANITY_EDITOR_TOKEN });
const [existingEvents, existingTeam] = await Promise.all([sanity.list("rudelEvent"), sanity.list("rudelTeamMember")]);
if (existingEvents.length || existingTeam.length) throw new Error("Import abgebrochen: Das Dataset enthält bereits Rudelbar-Inhalte.");

const event = events[0];
await sanity.saveDraft("rudelEvent", "rudel-event-scharnebeck-2026-10-02", {
  title: event.title, date: event.date, time: event.time, venue: event.venue,
  address: event.address, description: event.description, mapUrl: event.mapUrl, order: event.order,
});

const assetDir = resolve(dirname(fileURLToPath(import.meta.url)), "../app/public/assets");
for (const member of team) {
  const filename = member.photoUrl.split("/").pop();
  const mime = filename.endsWith(".png") ? "image/png" : "image/jpeg";
  const image = await sanity.uploadImage(await readFile(resolve(assetDir, filename)), mime, filename);
  await sanity.saveDraft("rudelTeamMember", `rudel-team-${member.name.toLowerCase()}`, {
    name: member.name, role: member.role, bio: member.bio, order: member.order,
    photo: { _type: "image", asset: { _type: "reference", _ref: image.assetId } }, photoUrl: image.url,
  });
}
console.log("Vorhandener Termin und fünf Teamprofile wurden als Entwürfe übertragen. Es wurde nichts veröffentlicht.");
