export const events = [{
  _id: "preview-scharnebeck", title: "Premiere in Scharnebeck", date: "2026-10-02", time: "ab 18 Uhr",
  venue: "Rathaus Gemeinde Scharnebeck", address: "Bardowicker Straße 2, 21379 Scharnebeck",
  description: "Rudel Bar startet am Rathaus der Gemeinde Scharnebeck. Komm vorbei, triff Menschen aus dem Ort und bleib so lange, wie es für dich passt.",
  mapUrl: "https://www.google.com/maps/place/Bardowicker+Str.+2,+21379+Scharnebeck/@53.2935625,10.5041127,17z/data=!3m1!4b1!4m6!3m5!1s0x47b1e060266d87bf:0xcf8e2bf556fe16b3!8m2!3d53.2935625!4d10.5066876!16s%2Fg%2F11c156vvlz?hl=en&entry=ttu&g_ep=EgoyMDI2MDkxNi4wIKXMDSoASAFQAw%3D%3D",
  order: 0, published: true, draft: false,
}];

export const team = [
  ["Martin", "Inhaber · Kopf hinter der Rudelbar", "Der Kopf hinter der Rudelbar.", "team-martin.png"],
  ["Jan", "Teammitglied · Stellvertreter", "Der Zahlenkopf im Rudel: mit verdammt gutem Blick fürs Geld und trotzdem für jeden Spaß zu haben.", "team-jan.png"],
  ["Jannik", "Teammitglied · Medienbeauftragter", "Unser Mann für Hardware und Social Media. Er bringt die Technik zum Laufen, das Rudel ins Netz und packt an, bevor andere überhaupt merken, dass Arbeit da ist.", "team-jannik.png"],
  ["Paddy", "Teammitglied · Event-Beauftragter", "Der Gourmet im Spielbetrieb. Er kümmert sich um Genuss und liefert Ideen für Spiele und Aktionen, bei denen Fremde miteinander lachen – und am Ende vielleicht als Freunde nach Hause gehen.", "team-paddy.png"],
  ["Patryk", "Teammitglied · Einsatzbeauftragter", "Unser Mann für den Einsatz. Er packt an, wo Hilfe gebraucht wird, behält auch dann die Ruhe, wenn es hektisch wird, und macht aus Ideen echte Rudelbar-Momente.", "team-patryk-portrait-v1.png"],
].map(([name, role, bio, photo], order) => ({ _id: `preview-${name.toLowerCase()}`, name, role, bio, photoUrl: `/seed-assets/${photo}`, order, published: true, draft: false }));
