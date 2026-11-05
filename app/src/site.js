export const SITE_NAME = "Rudel Bar";
export const INSTAGRAM = "https://www.instagram.com/rudelbar/";
export const CONTACT_EMAIL = "info@rudelbar.de";
export const CONTACT_PHONE = "+49 152 59574522";
export const SITE_URL = import.meta.env?.VITE_SITE_URL || "https://rudelbar.de/";
export const BASE_PATH = new URL(SITE_URL).pathname.replace(/\/?$/, "/");

export function sitePath(path = "") {
  return `${BASE_PATH}${String(path).replace(/^\/+/, "")}`;
}
export function slug(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
export function contentSlug(item) {
  if (/^[a-z0-9-]{1,220}$/.test(item.slug || "")) return item.slug;
  return `${slug(item.title) || "rudelabend"}-${item._id}`;
}
export const postPath = post => sitePath(`aktuelles/${contentSlug(post)}/`);
export const eventPath = event => sitePath(`termine/${contentSlug(event)}/`);

export function routeFor(pathname) {
  let path;
  try { path = decodeURIComponent(pathname); } catch { return { page: "404" }; }
  if (!path.startsWith(BASE_PATH)) return { page: "404" };
  const relative = path.slice(BASE_PATH.length).replace(/^\/+|\/+$/g, "");
  if (!relative || relative === "index.html") return { page: "start" };
  if (["termine", "das-rudel", "aktuelles", "dein-event", "kontakt", "datenschutz", "impressum"].includes(relative)) return { page: relative };
  if (["datenschutz.html", "impressum.html"].includes(relative)) return { page: relative.replace(".html", "") };
  if (relative.startsWith("aktuelles/")) return { page: "beitrag", key: relative.slice(10) };
  if (relative.startsWith("termine/")) return { page: "termin", key: relative.slice(8) };
  return { page: "404" };
}
export function matchContent(items, key) {
  return items.find(item => item._id === key || contentSlug(item) === key || key?.endsWith(`-${item._id}`));
}
export function legacyPath(hash, content) {
  if (!hash?.startsWith("#/")) return null;
  const old = hash.slice(2).replace(/\/+$/, "");
  if (old.startsWith("aktuelles/")) {
    const post = matchContent(content.posts || [], old.slice(10));
    return post ? postPath(post) : null;
  }
  const aliases = { "ueber-uns": "das-rudel", planen: "dein-event" };
  const path = aliases[old] || old;
  return ["", "termine", "das-rudel", "aktuelles", "dein-event", "kontakt"].includes(path) ? sitePath(path ? `${path}/` : "") : null;
}
