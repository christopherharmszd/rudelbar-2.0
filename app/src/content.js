export const previewEvents = [{
  _id: "preview-scharnebeck", title: "Premiere in Scharnebeck", date: "2026-10-02", time: "ab 18 Uhr",
  venue: "Rathaus Gemeinde Scharnebeck", address: "Bardowicker Straße 2, 21379 Scharnebeck",
  description: "Rudel Bar startet am Rathaus der Gemeinde Scharnebeck. Komm vorbei, triff Menschen aus dem Ort und bleib so lange, wie es für dich passt.",
  mapUrl: "https://www.google.com/maps/place/Bardowicker+Str.+2,+21379+Scharnebeck/@53.2935625,10.5041127,17z/data=!3m1!4b1!4m6!3m5!1s0x47b1e060266d87bf:0xcf8e2bf556fe16b3!8m2!3d53.2935625!4d10.5066876!16s%2Fg%2F11c156vvlz?hl=en&entry=ttu&g_ep=EgoyMDI2MDkxNi4wIKXMDSoASAFQAw%3D%3D",
  order: 0,
}];

export const previewTeam = [
  ["Martin", "Inhaber · Kopf hinter der Rudelbar", "Der Kopf hinter der Rudelbar.", "team-martin.png"],
  ["Jan", "Teammitglied · Stellvertreter", "Der Zahlenkopf im Rudel: mit verdammt gutem Blick fürs Geld und trotzdem für jeden Spaß zu haben.", "team-jan.png"],
  ["Jannik", "Teammitglied · Medienbeauftragter", "Unser Mann für Hardware und Social Media. Er bringt die Technik zum Laufen, das Rudel ins Netz und packt an, bevor andere überhaupt merken, dass Arbeit da ist.", "team-jannik.png"],
  ["Paddy", "Teammitglied · Event-Beauftragter", "Der Gourmet im Spielbetrieb. Er kümmert sich um Genuss und liefert Ideen für Spiele und Aktionen, bei denen Fremde miteinander lachen – und am Ende vielleicht als Freunde nach Hause gehen.", "team-paddy.png"],
  ["Patryk", "Teammitglied · Einsatzbeauftragter", "Unser Mann für den Einsatz. Er packt an, wo Hilfe gebraucht wird, behält auch dann die Ruhe, wenn es hektisch wird, und macht aus Ideen echte Rudelbar-Momente.", "team-patryk-portrait-v1.png"],
].map(([name, role, bio, photo], order) => ({ _id: `preview-${name.toLowerCase()}`, name, role, bio, photoUrl: `./assets/${photo}`, order }));

export const todayLocal = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
export const upcomingEvents = (events, today = todayLocal()) => events.filter(event => /^\d{4}-\d{2}-\d{2}$/.test(event.date || "") && event.date >= today);
export const nextEvent = (events, today = todayLocal()) => [...upcomingEvents(events, today)].sort((a, b) => a.date.localeCompare(b.date) || (a.order ?? 0) - (b.order ?? 0))[0] || null;
export const orderedContent = items => [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.date || a.name || "").localeCompare(String(b.date || b.name || "")));
export const formattedDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`)) : date;

export function publicConfig(env) {
  const projectId = env.VITE_SANITY_PROJECT_ID;
  const dataset = env.VITE_SANITY_DATASET;
  return /^[a-z0-9-]+$/i.test(projectId || "") && /^[a-z0-9_-]+$/i.test(dataset || "") ? { projectId, dataset } : null;
}

export async function loadPublishedContent(config, signal) {
  if (!config) return { events: previewEvents, team: previewTeam, preview: true };
  const base = `https://${config.projectId}.api.sanity.io/v2025-02-19/data/query/${config.dataset}`;
  async function query(type) {
    const url = `${base}?perspective=published&query=${encodeURIComponent(`*[_type == "${type}"]`)}`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Sanity HTTP ${response.status}`);
    const data = await response.json();
    return data.result || [];
  }
  const [events, team] = await Promise.all([query("rudelEvent"), query("rudelTeamMember")]);
  return { events, team, preview: false };
}
