const API_VERSION = "v2025-02-19";

export function createSanity({ projectId, dataset, token }) {
  if (!/^[a-z0-9-]+$/i.test(projectId) || !/^[a-z0-9_-]+$/i.test(dataset)) {
    throw new Error("Ungültige Sanity-Konfiguration.");
  }
  const base = `https://${projectId}.api.sanity.io/${API_VERSION}`;

  async function request(path, options = {}) {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.description || data.message || `Sanity: HTTP ${response.status}`);
    return data;
  }

  async function list(type) {
    const query = encodeURIComponent('*[_type == $type]');
    const params = encodeURIComponent(JSON.stringify(type));
    const data = await request(`/data/query/${dataset}?perspective=raw&query=${query}&%24type=${params}`);
    const entries = new Map();
    for (const doc of data.result || []) {
      const draft = doc._id.startsWith("drafts.");
      const id = draft ? doc._id.slice(7) : doc._id;
      const entry = entries.get(id) || { id, published: false, draft: false };
      if (draft) { entry.draft = true; entry.content = doc; }
      else { entry.published = true; if (!entry.draft) entry.content = doc; }
      entries.set(id, entry);
    }
    return [...entries.values()].map(({ content, ...meta }) => ({ ...meta, ...content, _id: meta.id })).sort((a, b) =>
      (a.order ?? 0) - (b.order ?? 0) || (type === "rudelEvent" ? String(a.date || "").localeCompare(String(b.date || "")) : String(a.name || "").localeCompare(String(b.name || ""))));
  }

  async function getDocument(id) {
    const query = encodeURIComponent('*[_id == $id][0]');
    const param = encodeURIComponent(JSON.stringify(id));
    const data = await request(`/data/query/${dataset}?perspective=raw&query=${query}&%24id=${param}`);
    return data.result;
  }

  async function mutate(mutations) {
    return request(`/data/mutate/${dataset}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations, returnDocuments: false }),
    });
  }

  async function saveDraft(type, id, fields) {
    await mutate([{ createOrReplace: { _id: `drafts.${id}`, _type: type, ...fields } }]);
  }

  async function publish(id) {
    const draft = await getDocument(`drafts.${id}`);
    if (!draft) throw new Error("Kein Entwurf zum Veröffentlichen vorhanden.");
    const { _id, _rev, _createdAt, _updatedAt, ...content } = draft;
    await mutate([{ createOrReplace: { _id: id, ...content } }, { delete: { id: `drafts.${id}` } }]);
  }

  async function unpublish(id) {
    const published = await getDocument(id);
    if (!published) throw new Error("Der Eintrag ist nicht veröffentlicht.");
    const draft = await getDocument(`drafts.${id}`);
    const { _id, _rev, _createdAt, _updatedAt, ...content } = draft || published;
    await mutate([{ createOrReplace: { _id: `drafts.${id}`, ...content } }, { delete: { id } }]);
  }

  async function uploadImage(buffer, mime, filename) {
    const path = `/assets/images/${dataset}?filename=${encodeURIComponent(filename)}`;
    const data = await request(path, { method: "POST", headers: { "Content-Type": mime }, body: buffer });
    return { assetId: data.document?._id, url: data.document?.url };
  }

  return { list, saveDraft, publish, unpublish, uploadImage };
}
