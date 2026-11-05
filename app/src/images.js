import { sitePath } from "./site.js";

export const isSanityImage = source => {
  try { const url = new URL(source); return url.protocol === "https:" && url.hostname === "cdn.sanity.io" && url.pathname.startsWith("/images/"); }
  catch { return false; }
};
export function imageUrl(source, width = 960) {
  if (!isSanityImage(source)) return source;
  const url = new URL(source);
  url.searchParams.set("w", String(width));
  url.searchParams.set("auto", "format");
  url.searchParams.set("q", "82");
  url.searchParams.set("fit", "max");
  return url.href;
}
export function imageSources(source, widths = [320, 640, 960, 1440]) {
  return isSanityImage(source) ? widths.map(width => `${imageUrl(source, width)} ${width}w`).join(", ") : undefined;
}
export function imageDimensions(source) {
  const match = String(source).match(/-(\d+)x(\d+)\.[a-z]+(?:\?|$)/i);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : {};
}
export const localImage = (name, width) => sitePath(`assets/${name}-${width}.webp`);
export const localSources = (name, widths = [320, 640, 960, 1440]) => widths.map(width => `${localImage(name, width)} ${width}w`).join(", ");

export function imageDescription(image, post, index) {
  const supplied = String(image.alt || "").trim();
  if (supplied && supplied !== String(post.teaser || "").trim()) return supplied;
  return String(image.caption || "").trim() || `${post.title} – Bild ${index + 1}`;
}
