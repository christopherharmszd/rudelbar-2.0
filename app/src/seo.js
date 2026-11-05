import { SITE_NAME, SITE_URL, CONTACT_EMAIL, CONTACT_PHONE, INSTAGRAM, sitePath, postPath, eventPath, matchContent } from "./site.js";
import { imageUrl, isSanityImage } from "./images.js";

const pages = {
  start: ["Rudel Bar – die mobile Kneipe für gemeinsame Abende", "Die mobile Kneipe, die Menschen zusammenbringt: Entdecke Rudel Abende, lerne das Team kennen oder plane einen Abend für deinen Ort."],
  termine: ["Termine und Rudel Abende | Rudel Bar", "Wo trifft sich das Rudel als Nächstes? Hier findest du veröffentlichte Rudel Abende mit Datum, Veranstaltungsort und Routenlink."],
  "das-rudel": ["Das Rudel – die Menschen hinter der mobilen Kneipe", "Lerne das Rudelbar-Team kennen: die Menschen, die gemeinsam anpacken und mobile Dorfabende möglich machen."],
  aktuelles: ["Aktuelles aus dem Rudel | Rudel Bar", "Geschichten, Einblicke und Bilder von Rudel Abenden. Entdecke, was rund um die mobile Rudelbar passiert."],
  "dein-event": ["Rudelbar für dein Event – gemeinsam einen Abend planen", "Du möchtest einen Rudel Abend für deinen Ort, Verein oder Anlass planen? Erfahre, wie eine Anfrage abläuft, und sprich mit dem Rudelbar-Team."],
  kontakt: ["Kontakt zur Rudelbar – Anfrage, E-Mail und Telefon", "Schreib dem Rudelbar-Team eine Nachricht, sende eine Eventanfrage oder nimm direkt per E-Mail und Telefon Kontakt auf."],
  datenschutz: ["Datenschutz und Cookies | Rudel Bar", "Informationen zu Website-Hosting, Kontaktformularen, Cookies und deinen Datenschutzrechten bei der Rudel Bar."],
  impressum: ["Impressum | Rudel Bar", "Anbieter und Kontaktinformationen der Rudel Bar: Martin Küster, Kielort 16c, 22850 Norderstedt."],
  "404": ["Seite nicht gefunden | Rudel Bar", "Diese Seite ist nicht verfügbar. Hier geht es zu Startseite, Rudel Abenden und Kontakt."],
};
const full = path => new URL(path, SITE_URL).href;

function startDate(event) {
  const time = String(event.time || "").match(/(?:^|\D)(\d{1,2})(?::([0-5]\d)|\s*Uhr)/i);
  if (!time || Number(time[1]) > 23) return event.date;
  const offset = new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", timeZoneName: "shortOffset" }).format(new Date(`${event.date}T12:00:00Z`)).match(/GMT([+-])(\d+)/);
  return `${event.date}T${time[1].padStart(2, "0")}:${time[2] || "00"}:00${offset ? `${offset[1]}${offset[2].padStart(2, "0")}:00` : "+01:00"}`;
}

export function pageMetadata(route, content, pathname) {
  let [title, description] = pages[route.page] || pages["404"];
  let canonical = full(pathname);
  let image = full(sitePath("assets/rudelbar-share.jpg"));
  let type = "website";
  let missing = route.page === "404";
  const schema = [{
    "@type": "Organization", "@id": `${SITE_URL}#organisation`, name: SITE_NAME,
    url: SITE_URL, logo: full(sitePath("assets/favicon-192.png")), email: CONTACT_EMAIL,
    telephone: CONTACT_PHONE, sameAs: [INSTAGRAM],
    address: { "@type": "PostalAddress", streetAddress: "Kielort 16c", postalCode: "22850", addressLocality: "Norderstedt", addressCountry: "DE" },
  }];
  if (route.page === "beitrag") {
    const post = matchContent(content.posts || [], route.key);
    if (!post) missing = true;
    else {
      title = `${post.title} | ${SITE_NAME}`;
      description = post.teaser;
      canonical = full(postPath(post));
      type = "article";
      const cover = post.images?.find(item => isSanityImage(item.url));
      if (cover) { const social = new URL(imageUrl(cover.url, 1200)); social.searchParams.delete("auto"); social.searchParams.set("fm", "jpg"); image = social.href; }
      schema.push({ "@type": "Article", headline: post.title, description: post.teaser, datePublished: post.date,
        ...(post._updatedAt ? { dateModified: post._updatedAt } : {}), image, mainEntityOfPage: canonical,
        author: { "@id": `${SITE_URL}#organisation` }, publisher: { "@id": `${SITE_URL}#organisation` } });
    }
  }
  if (route.page === "termin") {
    const event = matchContent(content.events || [], route.key);
    if (!event) missing = true;
    else {
      title = `${event.title} – ${event.date} | ${SITE_NAME}`;
      description = event.description;
      canonical = full(eventPath(event));
      schema.push({ "@type": "Event", name: event.title, description: event.description, startDate: startDate(event), url: canonical,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled",
        location: { "@type": "Place", name: event.venue, ...(event.address ? { address: event.address } : {}) },
        organizer: { "@id": `${SITE_URL}#organisation` } });
    }
  }
  if (["datenschutz", "impressum"].includes(route.page)) canonical = full(sitePath(`${route.page}/`));
  if (missing) [title, description] = pages["404"];
  return { title, description, canonical, image, type, missing, jsonld: { "@context": "https://schema.org", "@graph": schema } };
}
