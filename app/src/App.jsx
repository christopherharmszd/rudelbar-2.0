import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, MapPin, Menu, Sparkles, UsersRound, X } from "lucide-react";
import { formattedDate, loadPublishedContent, newestPosts, nextEvent, orderedContent, publicConfig, upcomingEvents } from "./content.js";

const routes = [["Start", "#/"], ["Termine", "#/termine"], ["Das Rudel", "#/das-rudel"], ["Für dein Event", "#/dein-event"], ["Kontakt", "#/kontakt"]];
const themedAsset = (theme, base, extension) => theme ? `./assets/${base}-${theme}.png` : `./assets/${base}.${extension}`;
const contentConfig = publicConfig(import.meta.env);
const formEndpoint = "https://api.web3forms.com/submit";
const formAccessKey = "81cac36f-b95e-490a-b1c0-6b339f6a4302";
function InstagramMark() { return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5" /><circle cx="12" cy="12" r="4.1" /><circle cx="17.5" cy="6.7" r=".8" fill="currentColor" stroke="none" /></svg>; }

function routeFromHash() { const hash = window.location.hash || "#/"; if (hash.startsWith("#/aktuelles/")) return "beitrag"; if (hash === "#/aktuelles") return "aktuelles"; if (hash.includes("termine")) return "termine"; if (hash.includes("das-rudel") || hash.includes("ueber-uns")) return "das-rudel"; if (hash.includes("dein-event") || hash.includes("planen")) return "dein-event"; if (hash.includes("kontakt")) return "kontakt"; return "start"; }
const safePostImage = url => /^https:\/\/cdn\.sanity\.io\/images\//.test(url || "");
function PostCard({ post }) { const cover = post.images?.find(image => safePostImage(image.url)); return <article className="post-card"><a href={`#/aktuelles/${post._id}`} aria-label={`${post.title} lesen`}>{cover && <img src={cover.url} alt={cover.alt || ""} loading="lazy" />}<div className="post-card-copy"><p className="eyebrow gold">{formattedDate(post.date)}</p><h3>{post.title}</h3><p>{post.teaser}</p><span>Weiterlesen <ArrowRight size={17} aria-hidden="true" /></span></div></a></article>; }
function LatestPosts({ posts }) { if (!posts.length) return null; return <section className="latest-posts" aria-labelledby="latest-posts-title"><div className="latest-posts-head"><div><p className="eyebrow gold">NEUES AUS DEM RUDEL</p><h2 id="latest-posts-title">Aktuelles.</h2></div><a className="text-link" href="#/aktuelles">Alle Beiträge <ArrowRight size={17} /></a></div><div className="post-grid">{newestPosts(posts).slice(0, 3).map(post => <PostCard key={post._id} post={post} />)}</div></section>; }
function PostsPage({ posts }) { return <><PageIntro eyebrow="AKTUELLES" title="Neues aus dem Rudel.">Geschichten, Einblicke und Bilder von unterwegs.</PageIntro><section className="post-grid post-list" aria-label="Alle Beiträge">{newestPosts(posts).map(post => <PostCard key={post._id} post={post} />)}</section></>; }
function PostGallery({ images }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const closeButton = useRef(null);
  const openingButton = useRef(null);
  const touchStart = useRef(null);
  const open = activeIndex !== null;
  const move = direction => setActiveIndex(index => (index + direction + images.length) % images.length);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = event => {
      if (event.key === "Escape") { event.preventDefault(); setActiveIndex(null); }
      else if (event.key === "ArrowLeft" && images.length > 1) { event.preventDefault(); move(-1); }
      else if (event.key === "ArrowRight" && images.length > 1) { event.preventDefault(); move(1); }
      else if (event.key === "Tab") {
        const controls = [...document.querySelectorAll(".post-lightbox button")];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      openingButton.current?.focus();
    };
  }, [open, images.length]);

  return <>
    <div className="post-gallery">{images.map((image, index) => <figure key={image._key || index}>
      <button className="post-image-open" type="button" aria-label={`Bild ${index + 1} von ${images.length} groß ansehen`} onClick={event => { openingButton.current = event.currentTarget; setActiveIndex(index); }}>
        <img src={image.url} alt={image.alt || ""} loading="lazy" />
      </button>
      {image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>)}</div>
    {open && <div className="post-lightbox-backdrop" onClick={event => { if (event.target === event.currentTarget) setActiveIndex(null); }}>
      <section className="post-lightbox" role="dialog" aria-modal="true" aria-label="Bildergalerie">
        <div className="post-lightbox-top"><span>Bild {activeIndex + 1} von {images.length}</span><button ref={closeButton} type="button" aria-label="Galerie schließen" onClick={() => setActiveIndex(null)}><X aria-hidden="true" /></button></div>
        <div className="post-lightbox-stage" onTouchStart={event => { touchStart.current = [event.touches[0].clientX, event.touches[0].clientY]; }} onTouchEnd={event => {
          if (!touchStart.current || images.length < 2) return;
          const dx = event.changedTouches[0].clientX - touchStart.current[0];
          const dy = event.changedTouches[0].clientY - touchStart.current[1];
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
          touchStart.current = null;
        }}>
          {images.length > 1 && <button className="post-lightbox-arrow previous" type="button" aria-label="Vorheriges Bild" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></button>}
          <img src={images[activeIndex].url} alt={images[activeIndex].alt || ""} />
          {images.length > 1 && <button className="post-lightbox-arrow next" type="button" aria-label="Nächstes Bild" onClick={() => move(1)}><ChevronRight aria-hidden="true" /></button>}
        </div>
        {images[activeIndex].caption && <p className="post-lightbox-caption">{images[activeIndex].caption}</p>}
      </section>
    </div>}
  </>;
}
function PostPage({ post }) {
  const images = (post.images || []).filter(image => safePostImage(image.url));
  return <article className="post-detail"><a className="text-link" href="#/aktuelles">← Alle Beiträge</a><p className="eyebrow gold">{formattedDate(post.date)}</p><h1>{post.title}</h1><p className="post-lead">{post.teaser}</p><div className="post-body">{String(post.body || "").split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{images.length > 0 && <PostGallery images={images} />}</article>;
}
function EventDetails({ event }) { return <div className="event-details" aria-label={`Informationen zu ${event.title}`}><div><CalendarDays aria-hidden="true" /><p><strong>{formattedDate(event.date)}</strong><br />{event.time}</p></div><div><MapPin aria-hidden="true" /><p><strong>{event.venue}</strong>{event.address && <><br />{event.address}</>}</p></div></div>; }
function EventCard({ event, home = false }) { return <section className={home ? "next-event" : "next-event compact-event"} aria-label={event.title}><div><p className="eyebrow gold">{home ? "NÄCHSTER RUDEL ABEND" : "RUDEL ABEND"}</p><h2>{event.title}</h2><p><strong>{formattedDate(event.date)} · {event.time}</strong><br />{event.description}</p>{event.mapUrl?.startsWith("https://") && <a className="button" href={event.mapUrl} target="_blank" rel="noreferrer">Route öffnen</a>}</div><EventDetails event={event} /></section>; }
function EventPlaceholder({ error = false, home = false }) { return <section className={`next-event event-placeholder${home ? "" : " compact-event"}`} aria-label="Termine"><div><p className="eyebrow gold">RUDEL ABENDE</p><h2>{error ? "Termine gerade nicht verfügbar." : "Der nächste Ort kommt bald."}</h2><p>{error ? "Die Termine konnten nicht geladen werden. Versuch es bitte später noch einmal." : "Sobald ein neuer Rudel Abend feststeht, findest du hier alle Informationen."}</p><a href="#/dein-event" className="text-link">Einen Abend für deinen Ort planen <ArrowRight size={17} /></a></div><div className="placeholder-art" aria-hidden="true"><CalendarDays size={72} strokeWidth={1} /><span>Wir sehen uns bald.</span></div></section>; }
function PageIntro({ eyebrow, title, children }) { return <section className="page-intro"><p className="eyebrow gold">{eyebrow}</p><h1>{title}</h1><p className="lead">{children}</p></section>; }

function Home({ theme, event, contentError, posts }) { return <><section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow">DER MOBILE DORF TREFFPUNKT</p><h1 id="hero-title">Heute Abend<br />trifft sich das Dorf.</h1><p className="lead">Rudel Bar bringt Menschen zusammen – mobil, offen und in jedem Ort ein Stück Zuhause. Hier findest du den nächsten Rudel Abend in deiner Nähe und lernst das Rudel kennen, das ihn möglich macht.</p><div className="button-row"><a className="button" href="#/termine">Nächsten Abend finden</a><a className="button button-outline" href="#/das-rudel">Das Rudel kennenlernen</a></div><p className="hand-note">Gemeinsam<br />für lebendige Dörfer.</p></div><div className="map-panel"><p className="hand-note map-kicker">Gemeinsam<br />für lebendige Dörfer.</p><p className="map-caption">Kleine Orte.<br />Große Begegnungen.</p><img src={themedAsset(theme, "village-route-map", "png")} alt="Illustrative Route durch Scharnebeck, Brietlingen, Artlenburg, Hohnstorf und Echem" /></div></section>{event ? <EventCard event={event} home /> : <EventPlaceholder error={contentError} home />}<section className="home-paths" aria-label="Mehr von Rudel Bar"><a href="#/das-rudel"><UsersRound aria-hidden="true" /><span>Das Rudel</span><small>Wer hinter der Rudelbar steht</small><ArrowRight aria-hidden="true" /></a><a href="#/dein-event"><Sparkles aria-hidden="true" /><span>Rudelbar für dein Event</span><small>Gemeinsam einen Abend planen</small><ArrowRight aria-hidden="true" /></a></section><LatestPosts posts={posts} /><section className="evening-photo" aria-label="Der Rudelbar Wagen"><img src={themedAsset(theme, "rudelbar-abend", "jpg")} alt="Rudelbar Wagen bei einem Dorfabend unter Lichterketten" /><p>Der Rudelwagen.<br />Bereit für den Ort.</p><span>Gemeinsam.<br />Überall. Rudelbar.</span></section></>; }
function TeamPage({ team, contentError }) { return <><PageIntro eyebrow="DAS RUDEL" title="Die Menschen hinter der Rudelbar.">Die Rudelbar wird nicht von einer Idee allein getragen, sondern von Menschen, die sich kennen, einander vertrauen und gemeinsam anpacken.</PageIntro><section className="wolf-story"><img src="./assets/rudelbar-logo.png" alt="Rudelbar Wolfssymbol" /><div><p className="eyebrow gold">WARUM DER WOLF?</p><h2>Ein Rudel, das zusammenhält.</h2><p>Der Wolf ist bei Rudel Bar kein bloßes Zeichen. Er steht für den internen Zusammenhalt einer Gruppe, die sich seit vielen Jahren kennt und sich selbst als Rudel versteht.</p><p>Für einige begleitet dieses Zeichen sie sogar als Tattoo. Positiv besetzt, persönlich und gemeinsam: Genau diese Haltung soll man an einem Rudel Abend spüren.</p></div></section>{team.length ? <section className="team-grid" aria-label="Das Rudelbar Team">{orderedContent(team).map(member => <article key={member._id}><div className="team-image">{member.photoUrl?.startsWith("https://cdn.sanity.io/images/") || member.photoUrl?.startsWith("./assets/") ? <img className="team-photo" src={member.photoUrl} alt={`${member.name} aus dem Rudelbar-Team`} loading="lazy" /> : <span className="team-photo-placeholder" aria-hidden="true"><UsersRound size={54} /></span>}</div><h2>{member.name}</h2><p className="team-role">{member.role}</p><p>{member.bio}</p></article>)}</section> : <section className="team-empty">{contentError ? "Das Team konnte gerade nicht geladen werden." : "Das Rudel stellt sich bald vor."}</section>}</>; }
function EventsPage({ events, contentError }) { const upcoming = orderedContent(upcomingEvents(events)); return <><PageIntro eyebrow="TERMINE" title="Wo sich das Rudel trifft.">Hier findest du die kommenden Rudel Abende.</PageIntro>{upcoming.length ? <div className="event-list">{upcoming.map(event => <EventCard key={event._id} event={event} />)}</div> : <EventPlaceholder error={contentError} />}</>; }
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
    <p className="form-privacy">Mit dem Absenden werden deine Angaben zur Bearbeitung der Anfrage an Web3Forms übermittelt. Mehr dazu unter <a href="./datenschutz.html#kontaktformular">Datenschutz &amp; Cookies</a>.</p>
    {notice && <p className="notice form-send-status" role="status">{notice}</p>}
  </form>;
}
function EventBookingPage({ theme }) { return <><PageIntro eyebrow="RUDELBAR FÜR DEIN EVENT" title="Ein Abend, der Menschen zusammenbringt.">Die Rudelbar kommt dorthin, wo ein besonderer Abend entstehen soll. Erzählt uns kurz von eurem Ort oder eurem Anlass – alles Weitere klären wir persönlich.</PageIntro><section className="booking-layout"><div className="booking-copy"><img src={themedAsset(theme, "rudelbar-wagen", "jpeg")} alt="Der echte schwarz-goldene Rudelbar Wagen" /><p className="eyebrow gold">EURE ANFRAGE</p><h2>Auf einen guten Abend.</h2><p>Erzählt uns von eurem Vorhaben. Wir melden uns bei euch zurück.</p></div><BookingForm eventMode /></section></>; }
function ContactPage() { return <><PageIntro eyebrow="KONTAKT" title="Damit wir gut ins Gespräch kommen.">Du möchtest einen Rudel Abend planen oder hast eine Frage? Schreib uns – wir melden uns bei dir zurück.</PageIntro><section className="contact-only"><BookingForm /></section></>; }

export function App() {
  const search = new URLSearchParams(window.location.search);
  const previewThemes = search.get("previewThemes") === "1";
  const [theme, setTheme] = useState(["dusk", "evening", "black"].includes(search.get("theme")) ? search.get("theme") : "black");
  const [route, setRoute] = useState(routeFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [content, setContent] = useState({ events: [], team: [], posts: [] });
  const [contentError, setContentError] = useState(false);
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme; }, [theme]);
  useEffect(() => { const update = () => { setRoute(routeFromHash()); setMenuOpen(false); window.scrollTo(0, 0); }; window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  useEffect(() => { const controller = new AbortController(); loadPublishedContent(contentConfig, controller.signal).then(setContent).catch(error => { if (error.name !== "AbortError") setContentError(true); }); return () => controller.abort(); }, []);
  const chooseTheme = (nextTheme) => { setTheme(nextTheme); const params = new URLSearchParams(window.location.search); if (nextTheme) params.set("theme", nextTheme); else params.delete("theme"); window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`); };
  const posts = content.posts || [];
  const publicRoutes = posts.length ? [...routes.slice(0, 3), ["Aktuelles", "#/aktuelles"], ...routes.slice(3)] : routes;
  const articleId = window.location.hash.match(/^#\/aktuelles\/([a-z0-9-]+)$/i)?.[1];
  const article = posts.find(post => post._id === articleId);
  const page = route === "termine" ? <EventsPage events={content.events} contentError={contentError} /> : route === "das-rudel" ? <TeamPage team={content.team} contentError={contentError} /> : route === "aktuelles" && posts.length ? <PostsPage posts={posts} /> : route === "beitrag" && article ? <PostPage key={article._id} post={article} /> : route === "dein-event" ? <EventBookingPage theme={theme} /> : route === "kontakt" ? <ContactPage /> : <Home theme={theme} event={nextEvent(content.events)} contentError={contentError} posts={posts} />;
  return <main>{previewThemes && <aside className="theme-switcher" aria-label="Farbvarianten-Vorschau"><span>Farbtest</span>{[["", "Original"], ["dusk", "Dämmerung"], ["evening", "Abend"], ["black", "Schwarz"]].map(([value, label]) => <button key={label} className={theme === value ? "is-active" : ""} type="button" onClick={() => chooseTheme(value)}>{label}</button>)}</aside>}<header className="site-header"><a className="brand" href="#/" aria-label="Rudel Bar Startseite"><img src="./assets/rudelbar-logo.png" alt="Rudelbar Logo" /><span>Rudel Bar<small>Die mobile Kneipe</small></span></a><nav className={menuOpen ? "primary-nav is-open" : "primary-nav"} aria-label="Hauptnavigation">{publicRoutes.map(([label, href]) => <a key={href} href={href} aria-current={href === "#/" ? route === "start" ? "page" : undefined : href === "#/aktuelles" ? ["aktuelles", "beitrag"].includes(route) ? "page" : undefined : href.endsWith(route) ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav><a className="button button-small header-cta" href="#/dein-event">Event anfragen</a><button className="menu-button" aria-label="Menü öffnen" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={25} />}</button></header>{page}<footer className="site-footer"><div className="footer-brand"><a href="#/" aria-label="Rudel Bar Startseite"><img src="./assets/rudelbar-logo.png" alt="" /><span>Rudel Bar<small>Die mobile Kneipe</small></span></a><p>Für gute Abende und lebendige Dörfer.</p></div><nav className="footer-nav" aria-label="Footer-Navigation"><a href="#/termine">Termine</a><a href="#/das-rudel">Das Rudel</a>{posts.length > 0 && <a href="#/aktuelles">Aktuelles</a>}<a href="#/kontakt">Kontakt</a></nav><div className="footer-social"><a href="https://www.instagram.com/rudelbar/" target="_blank" rel="noopener noreferrer" aria-label="Rudelbar auf Instagram öffnen"><InstagramMark />Instagram <ArrowRight size={15} aria-hidden="true" /></a><a className="back-top" href="#/">Nach oben <ChevronDown size={16} aria-hidden="true" /></a></div><nav className="footer-legal" aria-label="Rechtliches"><a href="./impressum.html">Impressum</a><a href="./datenschutz.html">Datenschutz &amp; Cookies</a></nav></footer></main>;
}
