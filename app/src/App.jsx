import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, MapPin, Menu, Sparkles, UsersRound, X } from "lucide-react";

const event = { date: "Freitag, 2. Oktober 2026", time: "ab 18 Uhr", venue: "Rathaus Gemeinde Scharnebeck", address: "Bardowicker Straße 2, 21379 Scharnebeck", mapUrl: "https://www.google.com/maps/place/Bardowicker+Str.+2,+21379+Scharnebeck/@53.2935625,10.5041127,17z/data=!3m1!4b1!4m6!3m5!1s0x47b1e060266d87bf:0xcf8e2bf556fe16b3!8m2!3d53.2935625!4d10.5066876!16s%2Fg%2F11c156vvlz?hl=en&entry=ttu&g_ep=EgoyMDI2MDkxNi4wIKXMDSoASAFQAw%3D%3D" };
const routes = [["Start", "#/"], ["Termine", "#/termine"], ["Das Rudel", "#/das-rudel"], ["Für dein Event", "#/dein-event"], ["Kontakt", "#/kontakt"]];
const team = [
  ["Martin", "Inhaber · Kopf hinter der Rudelbar", "Der Kopf hinter der Rudelbar."],
  ["Jan", "Teammitglied · Stellvertreter", "Der Zahlenkopf im Rudel: mit verdammt gutem Blick fürs Geld und trotzdem für jeden Spaß zu haben."],
  ["Jannik", "Teammitglied · Medienbeauftragter", "Unser Mann für Hardware und Social Media. Er bringt die Technik zum Laufen, das Rudel ins Netz und packt an, bevor andere überhaupt merken, dass Arbeit da ist."],
  ["Paddy", "Teammitglied · Event-Beauftragter", "Der Gourmet im Spielbetrieb. Er kümmert sich um Genuss und liefert Ideen für Spiele und Aktionen, bei denen Fremde miteinander lachen – und am Ende vielleicht als Freunde nach Hause gehen."],
  ["Patryk", "Teammitglied · Einsatzbeauftragter", "Unser Mann für den Einsatz. Er packt an, wo Hilfe gebraucht wird, behält auch dann die Ruhe, wenn es hektisch wird, und macht aus Ideen echte Rudelbar-Momente."],
];
const themedAsset = (theme, base, extension) => theme ? `./assets/${base}-${theme}.png` : `./assets/${base}.${extension}`;
const teamPhotos = {
  Martin: "./assets/team-martin.png",
  Jan: "./assets/team-jan.png",
  Jannik: "./assets/team-jannik.png",
  Paddy: "./assets/team-paddy.png",
  Patryk: "./assets/team-patryk-portrait-v1.png",
};
const formEndpoint = "https://api.web3forms.com/submit";
const formAccessKey = "81cac36f-b95e-490a-b1c0-6b339f6a4302";

function routeFromHash() { const hash = window.location.hash || "#/"; if (hash.includes("termine")) return "termine"; if (hash.includes("das-rudel") || hash.includes("ueber-uns")) return "das-rudel"; if (hash.includes("dein-event") || hash.includes("planen")) return "dein-event"; if (hash.includes("kontakt")) return "kontakt"; return "start"; }
function EventDetails() { return <div className="event-details" aria-label="Informationen zum nächsten Abend"><div><CalendarDays aria-hidden="true" /><p><strong>{event.date}</strong><br />{event.time}</p></div><div><MapPin aria-hidden="true" /><p><strong>{event.venue}</strong><br />{event.address}</p></div><div><UsersRound aria-hidden="true" /><p><strong>Draußen am Rathaus</strong><br />Gute Gespräche, neue Gesichter und ein lebendiges Miteinander</p></div></div>; }
function EventCard({ compact = false }) { return <section className={compact ? "next-event compact-event" : "next-event"} aria-labelledby="next-title"><div><p className="eyebrow gold">NÄCHSTER RUDEL ABEND</p><h2 id="next-title">Premiere in Scharnebeck</h2><p><strong>{event.date} · {event.time}</strong><br />Rudel Bar startet am Rathaus der Gemeinde Scharnebeck. Komm vorbei, triff Menschen aus dem Ort und bleib so lange, wie es für dich passt.</p><a className="button" href={event.mapUrl} target="_blank" rel="noreferrer">Route öffnen</a></div><EventDetails /></section>; }
function PageIntro({ eyebrow, title, children }) { return <section className="page-intro"><p className="eyebrow gold">{eyebrow}</p><h1>{title}</h1><p className="lead">{children}</p></section>; }

function Home({ theme }) { return <><section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow">DER MOBILE DORF TREFFPUNKT</p><h1 id="hero-title">Heute Abend<br />trifft sich das Dorf.</h1><p className="lead">Rudel Bar bringt Menschen zusammen – mobil, offen und in jedem Ort ein Stück Zuhause. Hier findest du den nächsten Rudel Abend in deiner Nähe und lernst das Rudel kennen, das ihn möglich macht.</p><div className="button-row"><a className="button" href="#/termine">Nächsten Abend finden</a><a className="button button-outline" href="#/das-rudel">Das Rudel kennenlernen</a></div><p className="hand-note">Gemeinsam<br />für lebendige Dörfer.</p></div><div className="map-panel"><p className="hand-note map-kicker">Gemeinsam<br />für lebendige Dörfer.</p><p className="map-caption">Kleine Orte.<br />Große Begegnungen.</p><img src={themedAsset(theme, "village-route-map", "png")} alt="Illustrative Route durch Scharnebeck, Brietlingen, Artlenburg, Hohnstorf und Echem" /></div></section><EventCard /><section className="home-paths" aria-label="Mehr von Rudel Bar"><a href="#/das-rudel"><UsersRound aria-hidden="true" /><span>Das Rudel</span><small>Wer hinter der Rudelbar steht</small><ArrowRight aria-hidden="true" /></a><a href="#/dein-event"><Sparkles aria-hidden="true" /><span>Rudelbar für dein Event</span><small>Gemeinsam einen Abend planen</small><ArrowRight aria-hidden="true" /></a></section><section className="evening-photo" aria-label="Der Rudelbar Wagen"><img src={themedAsset(theme, "rudelbar-abend", "jpg")} alt="Rudelbar Wagen bei einem Dorfabend unter Lichterketten" /><p>Der Rudelwagen.<br />Bereit für den Ort.</p><span>Gemeinsam.<br />Überall. Rudelbar.</span></section></>; }
function TeamPage() { return <><PageIntro eyebrow="DAS RUDEL" title="Die Menschen hinter der Rudelbar.">Die Rudelbar wird nicht von einer Idee allein getragen, sondern von Menschen, die sich kennen, einander vertrauen und gemeinsam anpacken.</PageIntro><section className="wolf-story"><img src="./assets/rudelbar-logo.png" alt="Rudelbar Wolfssymbol" /><div><p className="eyebrow gold">WARUM DER WOLF?</p><h2>Ein Rudel, das zusammenhält.</h2><p>Der Wolf ist bei Rudel Bar kein bloßes Zeichen. Er steht für den internen Zusammenhalt einer Gruppe, die sich seit vielen Jahren kennt und sich selbst als Rudel versteht.</p><p>Für einige begleitet dieses Zeichen sie sogar als Tattoo. Positiv besetzt, persönlich und gemeinsam: Genau diese Haltung soll man an einem Rudel Abend spüren.</p></div></section><section className="team-grid" aria-label="Das Rudelbar Team">{team.map(([name, role, text]) => <article key={name}><img className="team-photo" src={teamPhotos[name]} alt={`${name} aus dem Rudelbar-Team`} loading="lazy" /><h2>{name}</h2><p className="team-role">{role}</p><p>{text}</p></article>)}</section></>; }
function EventsPage() { return <><PageIntro eyebrow="TERMINE" title="Wo sich das Rudel trifft.">Hier stehen die kommenden Rudel Abende. Den Anfang macht Scharnebeck.</PageIntro><EventCard compact /><section className="next-note"><p className="eyebrow gold">DANACH</p><h2>Der nächste Ort kommt bald.</h2><p>Weitere Rudel Abende werden hier ergänzt, sobald Ort und Zeitpunkt feststehen.</p><a href="#/dein-event" className="text-link">Einen Abend für deinen Ort planen <ArrowRight size={17} /></a></section></>; }
function BookingForm({ eventMode = false }) {
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("access_key", formAccessKey);
    formData.set("subject", eventMode ? "Rudelbar: Event-Anfrage" : "Rudelbar: Kontaktanfrage");
    formData.set("from_name", "Rudelbar Website");
    formData.set("message", String(formData.get("nachricht") || ""));
    formData.delete("nachricht");
    if (eventMode) {
      const location = String(formData.get("ort") || "").trim();
      if (location) formData.set("Ort", location);
      formData.delete("ort");
      const date = String(formData.get("wunschdatum") || "");
      if (date) {
        const [year, month, day] = date.split("-");
        formData.set("Wunschtermin", `${day}.${month}.${year}`);
      }
      formData.delete("wunschdatum");
    }
    setSending(true);
    setNotice("Deine Anfrage wird gesendet …");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(formEndpoint, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        throw new Error(result.message || "Die Anfrage konnte nicht gesendet werden.");
      }
      form.reset();
      setNotice("Danke! Deine Anfrage wurde gesendet. Wir melden uns bei dir zurück.");
    } catch (error) {
      console.error("Rudelbar form submission failed:", error);
      setNotice("Das Senden hat nicht geklappt. Bitte versuche es erneut.");
    } finally {
      clearTimeout(timeout);
      setSending(false);
    }
  }

  return <form className="booking-form" onSubmit={submit} aria-busy={sending}>
    <label>Dein Name oder deine Gruppe<input required name="name" autoComplete="name" placeholder="Z. B. Anna Müller oder euer Verein" /></label>
    {eventMode && <>
      <label>Wo soll es stattfinden?<input name="ort" placeholder="Z. B. Echem oder euer Veranstaltungsort" /></label>
      <label>Wann soll es stattfinden? (optional)<input type="date" name="wunschdatum" /></label>
    </>}
    <label>Deine E-Mail-Adresse<input required type="email" name="email" autoComplete="email" placeholder="name@beispiel.de" /></label>
    <label>Deine Nachricht<textarea required name="nachricht" rows="5" placeholder={eventMode ? "Erzähl uns kurz von eurem Anlass und was ihr euch für den Abend wünscht." : "Was habt ihr vor?"} /></label>
    <input type="checkbox" name="botcheck" tabIndex={-1} aria-hidden="true" style={{ display: "none" }} />
    <button className="button" type="submit" disabled={sending}>{sending ? "Wird gesendet …" : "Anfrage senden"}</button>
    {notice && <p className="notice form-send-status" role="status">{notice}</p>}
  </form>;
}
function EventBookingPage({ theme }) { return <><PageIntro eyebrow="RUDELBAR FÜR DEIN EVENT" title="Ein Abend, der Menschen zusammenbringt.">Die Rudelbar kommt dorthin, wo ein besonderer Abend entstehen soll. Erzählt uns kurz von eurem Ort oder eurem Anlass – alles Weitere klären wir persönlich.</PageIntro><section className="booking-layout"><div className="booking-copy"><img src={themedAsset(theme, "rudelbar-wagen", "jpeg")} alt="Der echte schwarz-goldene Rudelbar Wagen" /><p className="eyebrow gold">EURE ANFRAGE</p><h2>Auf einen guten Abend.</h2><p>Erzählt uns von eurem Vorhaben. Wir melden uns bei euch zurück.</p></div><BookingForm eventMode /></section></>; }
function ContactPage() { return <><PageIntro eyebrow="KONTAKT" title="Damit wir gut ins Gespräch kommen.">Du möchtest einen Rudel Abend planen oder hast eine Frage? Schreib uns – wir melden uns bei dir zurück.</PageIntro><section className="contact-only"><BookingForm /></section></>; }

export function App() { const search = new URLSearchParams(window.location.search); const previewThemes = search.get("previewThemes") === "1"; const [theme, setTheme] = useState(["dusk", "evening", "black"].includes(search.get("theme")) ? search.get("theme") : "black"); const [route, setRoute] = useState(routeFromHash); const [menuOpen, setMenuOpen] = useState(false); useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme; }, [theme]); useEffect(() => { const update = () => { setRoute(routeFromHash()); setMenuOpen(false); window.scrollTo(0, 0); }; window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []); const chooseTheme = (nextTheme) => { setTheme(nextTheme); const params = new URLSearchParams(window.location.search); if (nextTheme) params.set("theme", nextTheme); else params.delete("theme"); window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`); }; const page = route === "termine" ? <EventsPage /> : route === "das-rudel" ? <TeamPage /> : route === "dein-event" ? <EventBookingPage theme={theme} /> : route === "kontakt" ? <ContactPage /> : <Home theme={theme} />; return <main>{previewThemes && <aside className="theme-switcher" aria-label="Farbvarianten-Vorschau"><span>Farbtest</span>{[["", "Original"], ["dusk", "Dämmerung"], ["evening", "Abend"], ["black", "Schwarz"]].map(([value, label]) => <button key={label} className={theme === value ? "is-active" : ""} type="button" onClick={() => chooseTheme(value)}>{label}</button>)}</aside>}<header className="site-header"><a className="brand" href="#/" aria-label="Rudel Bar Startseite"><img src="./assets/rudelbar-logo.png" alt="Rudelbar Logo" /><span>Rudel Bar<small>Die mobile Kneipe</small></span></a><nav className={menuOpen ? "primary-nav is-open" : "primary-nav"} aria-label="Hauptnavigation">{routes.map(([label, href]) => <a key={href} href={href} aria-current={(route === "start" && href === "#/") || href.endsWith(route) ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav><a className="button button-small header-cta" href="#/dein-event">Event anfragen</a><button className="menu-button" aria-label="Menü öffnen" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={25} />}</button></header>{page}<footer><span>Rudel Bar</span><span>Mobiler Dorf Treffpunkt</span><a href="#/">Nach oben <ChevronDown size={16} /></a></footer></main>; }
