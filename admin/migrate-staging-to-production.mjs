// One-time release seed: copy only the approved, published event and team profiles.
// Run with --apply after inspecting the dry-run summary. The script never copies drafts.
const projectId = process.env.SANITY_PROJECT_ID;
const token = process.env.SANITY_EDITOR_TOKEN;
if (projectId !== "uywmld5e" || !token) throw new Error("Sanity-Projekt oder Editor Token fehlt.");

const api = `https://${projectId}.api.sanity.io/v2025-02-19`;
const headers = { Authorization: `Bearer ${token}` };
const expectedIds = [
  "rudel-event-scharnebeck-2026-10-02",
  "rudel-team-jan",
  "rudel-team-jannik",
  "rudel-team-martin",
  "rudel-team-paddy",
  "rudel-team-patryk",
];

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!response.ok) throw new Error(`Sanity HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

async function query(dataset, groq) {
  const path = `/data/query/${dataset}?perspective=raw&query=${encodeURIComponent(groq)}`;
  return (await request(path)).result;
}

const contentQuery = '*[_type in ["rudelEvent", "rudelTeamMember", "rudelPost"]]';
const source = await query("staging", contentQuery);
const destination = await query("production", contentQuery);
const actualIds = source.map(doc => doc._id).sort();
if (JSON.stringify(actualIds) !== JSON.stringify([...expectedIds].sort())) {
  throw new Error(`Staging hat nicht mehr die sechs freigegebenen Einträge: ${actualIds.join(", ")}`);
}
if (destination.length) throw new Error("Produktions-Dataset enthält bereits Rudelbar-Inhalte. Migration abgebrochen.");
if (source.filter(doc => doc._type === "rudelEvent").length !== 1 ||
    source.filter(doc => doc._type === "rudelTeamMember").length !== 5) {
  throw new Error("Unerwartete Inhaltstypen in Staging.");
}
const assetIds = source.filter(doc => doc._type === "rudelTeamMember").map(doc => doc.photo?.asset?._ref);
if (assetIds.some(id => !/^image-[a-zA-Z0-9-]+$/.test(id)) || new Set(assetIds).size !== 5) {
  throw new Error("Die fünf Teamfotos sind nicht eindeutig referenziert.");
}
const assets = await query("staging", '*[_type == "sanity.imageAsset"]{_id,url,originalFilename,mimeType}');
const selectedAssets = assetIds.map(id => assets.find(asset => asset._id === id));
if (selectedAssets.some(asset => !asset || !asset.url?.startsWith(`https://cdn.sanity.io/images/${projectId}/staging/`))) {
  throw new Error("Mindestens ein Teamfoto fehlt im Staging-Dataset.");
}
console.log("Produktionsübernahme: 1 veröffentlichter Termin, 5 veröffentlichte Teamprofile und 5 referenzierte Fotos.");
console.log("Keine Entwürfe, archivierten Einträge oder Testbeiträge werden übertragen.");
if (!process.argv.includes("--apply")) {
  console.log("Prüflauf abgeschlossen. Mit --apply werden die Inhalte in das Produktions-Dataset geschrieben.");
  process.exit(0);
}

const migratedAssets = new Map();
for (const asset of selectedAssets) {
  const imageResponse = await fetch(asset.url);
  if (!imageResponse.ok) throw new Error(`Teamfoto konnte nicht geladen werden: HTTP ${imageResponse.status}`);
  const filename = asset.originalFilename || asset.url.split("/").pop();
  const uploaded = await request(`/assets/images/production?filename=${encodeURIComponent(filename)}`, {
    method: "POST",
    headers: { "Content-Type": asset.mimeType || "image/png" },
    body: await imageResponse.arrayBuffer(),
  });
  if (!uploaded.document?._id || !uploaded.document?.url?.startsWith(`https://cdn.sanity.io/images/${projectId}/production/`)) {
    throw new Error("Sanity hat für ein Teamfoto keine gültige Produktionsreferenz geliefert.");
  }
  migratedAssets.set(asset._id, { id: uploaded.document._id, url: uploaded.document.url });
}

const documents = source.map(original => {
  const { _rev, _createdAt, _updatedAt, ...doc } = original;
  if (doc._type === "rudelTeamMember") {
    const image = migratedAssets.get(doc.photo.asset._ref);
    doc.photo = { ...doc.photo, asset: { ...doc.photo.asset, _ref: image.id } };
    doc.photoUrl = image.url;
  }
  return doc;
});
await request("/data/mutate/production", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mutations: documents.map(doc => ({ createIfNotExists: doc })), returnDocuments: false }),
});
const saved = await query("production", contentQuery);
if (saved.length !== 6 || saved.some(doc => doc._type === "rudelTeamMember" && !doc.photoUrl?.includes("/production/"))) {
  throw new Error("Nachkontrolle der Produktionsinhalte fehlgeschlagen.");
}
console.log("Produktions-Dataset geprüft: 1 Termin, 5 Teamprofile, 5 Fotos; keine Beiträge.");
