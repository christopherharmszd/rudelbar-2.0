import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, MapPin, Menu, Sparkles, UsersRound, X } from "lucide-react";
import { formattedDate, loadPublishedContent, newestPosts, nextEvent, orderedContent, publicConfig, upcomingEvents, todayLocal } from "./content.js";
import { BASE_PATH, SITE_URL, INSTAGRAM, sitePath, postPath, eventPath, routeFor, legacyPath, matchContent } from "./site.js";
import { imageUrl, imageSources, imageDimensions, imageDescription, isSanityImage, localImage, localSources } from "./images.js";
import { pageMetadata } from "./seo.js";
import { Gallery } from "./Gallery.jsx";
import { BookingForm, DirectContact } from "./BookingForm.jsx";
import privacy from "./legal/datenschutz.html?raw";
import imprint from "./legal/impressum.html?raw";

const config = publicConfig(import.meta.env);
const defaultContent = { events: [], team: [], posts: [] };
const routeNames = [["Start", ""], ["Termine", "termine"], ["Das Rudel", "das-rudel"], ["Für dein Event", "dein-event"], ["Kontakt", "kontakt"]];
const themedName = (theme, name) => theme ? `${name}-${theme}` : name;

function Logo({ footer = false }) {
  return <a className={footer ? undefined : "brand"} href={sitePath()} aria-label="Rudel Bar Startseite"><img src={localImage("rudelbar-logo", 192)} width={footer ? 62 : 48} height={footer ? 68 : 54} alt="" /><span>Rudel Bar<small>Die mobile Kneipe</small></span></a>;
}
function InstagramMark() {
  return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5" /><circle cx="12" cy="12" r="4.1" /><circle cx="17.5" cy="6.7" r=".8" fill="currentColor" stroke="none" /></svg>;
}
function LocalImage({ theme, name, alt, eager = false, className }) {
  const asset = themedName(theme, name);
  return <img className={className} src={localImage(asset, 960)} srcSet={localSources(asset)} sizes="(max-width: 820px) 94vw, 60vw" width={name === "village-route-map" ? 1774 : 1655} height={name === "village-route-map" ? 887 : 950} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} decoding="async" />;
}
function PageIntro({ eyebrow, title, children, action }) {
  return <section className="page-intro"><p className="eyebrow gold">{eyebrow}</p><h1>{title}</h1><p className="lead">{children}</p>{action && <div className="button-row">{action}</div>}</section>;
}
function PostCard({ post }) {
  const cover = post.images?.find(item => isSanityImage(item.url));
  return <article className="post-card"><a href={postPath(post)} aria-label={`${post.title} lesen`}>{cover && <img src={imageUrl(cover.url, 640)} srcSet={imageSources(cover.url, [320, 640, 960])} sizes="(max-width: 600px) 94vw, (max-width: 820px) 46vw, 360px" {...imageDimensions(cover.url)} alt="" loading="lazy" decoding="async" />}<div className="post-card-copy"><p className="eyebrow gold">{formattedDate(post.date)}</p><h3>{post.title}</h3><p>{post.teaser}</p><span>Weiterlesen <ArrowRight size={17} aria-hidden="true" /></span></div></a></article>;
}
function LatestPosts({ posts }) {
  if (!posts.length) return null;
  return <section className="latest-posts" aria-labelledby="latest-posts-title"><div className="latest-posts-head"><div><p className="eyebrow gold">NEUES AUS DEM RUDEL</p><h2 id="latest-posts-title">Aktuelles.</h2></div><a className="text-link" href={sitePath("aktuelles/")}>Alle Beiträge <ArrowRight size={17} aria-hidden="true" /></a></div><div className="post-grid">{newestPosts(posts).slice(0, 3).map(post => <PostCard key={post._id} post={post} />)}</div></section>;
}
function EventDetails({ event }) {
  return <div className="event-details" aria-label={`Informationen zu ${event.title}`}><div><CalendarDays aria-hidden="true" /><p><strong><time dateTime={event.date}>{formattedDate(event.date)}</time></strong><br />{event.time}</p></div><div><MapPin aria-hidden="true" /><p><strong>{event.venue}</strong>{event.address && <><br />{event.address}</>}</p></div></div>;
}
function EventCard({ event, home = false, detail = false }) {
  return <section className={home ? "next-event" : "next-event compact-event"} aria-label={event.title}><div><p className="eyebrow gold">{home ? "NÄCHSTER RUDEL ABEND" : "RUDEL ABEND"}</p><h2>{detail ? event.title : <a href={eventPath(event)}>{event.title}</a>}</h2><p><strong>{formattedDate(event.date)} · {event.time}</strong><br />{event.description}</p><div className="button-row">{!detail && <a className="text-link" href={eventPath(event)}>Alle Informationen <ArrowRight size={17} aria-hidden="true" /></a>}{event.mapUrl?.startsWith("https://") && <a className="button" href={event.mapUrl} target="_blank" rel="noopener noreferrer">Route öffnen</a>}</div></div><EventDetails event={event} /></section>;
}
function EventPlaceholder({ error = false, home = false }) {
  return <section className={`next-event event-placeholder${home ? "" : " compact-event"}`} aria-label="Termine"><div><p className="eyebrow gold">RUDEL ABENDE</p><h2>{error ? "Termine gerade nicht verfügbar." : "Der nächste Ort kommt bald."}</h2><p>{error ? "Die Termine konnten nicht aktualisiert werden. Versuch es bitte später noch einmal." : "Sobald ein neuer Rudel Abend feststeht, findest du hier alle Informationen. Ankündigungen teilen wir auch auf Instagram."}</p><div className="button-row"><a href={INSTAGRAM} className="text-link" target="_blank" rel="noopener noreferrer">Rudelbar auf Instagram <ArrowRight size={17} aria-hidden="true" /></a><a href={sitePath("dein-event/")} className="text-link">Einen Abend für deinen Ort planen</a></div></div><div className="placeholder-art" aria-hidden="true"><CalendarDays size={72} strokeWidth={1} /><span>Wir sehen uns bald.</span></div></section>;
}
function Home({ theme, event, contentError, posts }) {
  return <><section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow">DER MOBILE DORF TREFFPUNKT</p><h1 id="hero-title">Heute Abend<br />trifft sich das Dorf.</h1><p className="lead">Rudel Bar bringt Menschen zusammen – mobil, offen und in jedem Ort ein Stück Zuhause. Hier findest du Rudel Abende und lernst das Team kennen, das sie möglich macht. Oder plane mit uns einen Abend für deinen Ort.</p><div className="button-row"><a className="button" href={sitePath("termine/")}>{event ? "Nächsten Abend finden" : "Termine & Ankündigungen"}</a><a className="button button-outline" href={sitePath("das-rudel/")}>Das Rudel kennenlernen</a></div><p className="hand-note">Gemeinsam<br />für lebendige Dörfer.</p></div><div className="map-panel"><p className="hand-note map-kicker">Gemeinsam<br />für lebendige Dörfer.</p><p className="map-caption">Kleine Orte.<br />Große Begegnungen.</p><LocalImage theme={theme} name="village-route-map" eager alt="Illustrative Route durch Scharnebeck, Brietlingen, Artlenburg, Hohnstorf und Echem" /></div></section>{event ? <EventCard event={event} home /> : <EventPlaceholder error={contentError} home />}<section className="home-paths" aria-label="Mehr von Rudel Bar"><a href={sitePath("das-rudel/")}><UsersRound aria-hidden="true" /><span>Das Rudel</span><small>Wer hinter der Rudelbar steht</small><ArrowRight aria-hidden="true" /></a><a href={sitePath("dein-event/")}><Sparkles aria-hidden="true" /><span>Rudelbar für dein Event</span><small>Gemeinsam einen Abend planen</small><ArrowRight aria-hidden="true" /></a></section><LatestPosts posts={posts} /><section className="evening-photo" aria-label="Der Rudelbar Wagen"><LocalImage theme={theme} name="rudelbar-abend" alt="Rudelbar Wagen bei einem Dorfabend unter Lichterketten" /><p>Der Rudelwagen.<br />Bereit für den Ort.</p><span>Gemeinsam.<br />Überall. Rudelbar.</span></section></>;
}
function TeamPage({ team, contentError }) {
  return <><PageIntro eyebrow="DAS RUDEL" title="Die Menschen hinter der Rudelbar.">Die Rudelbar wird nicht von einer Idee allein getragen, sondern von Menschen, die sich kennen, einander vertrauen und gemeinsam anpacken.</PageIntro><section className="wolf-story"><img src={localImage("rudelbar-logo", 384)} width="185" height="185" alt="Rudelbar Wolfssymbol" loading="lazy" /><div><p className="eyebrow gold">WARUM DER WOLF?</p><h2>Ein Rudel, das zusammenhält.</h2><p>Der Wolf ist bei Rudel Bar kein bloßes Zeichen. Er steht für den internen Zusammenhalt einer Gruppe, die sich seit vielen Jahren kennt und sich selbst als Rudel versteht.</p><p>Für einige begleitet dieses Zeichen sie sogar als Tattoo. Positiv besetzt, persönlich und gemeinsam: Genau diese Haltung soll man an einem Rudel Abend spüren.</p></div></section>{team.length ? <section className="team-grid" aria-label="Das Rudelbar Team">{orderedContent(team).map(member => <article key={member._id}><div className="team-image">{isSanityImage(member.photoUrl) || member.photoUrl?.startsWith("./assets/") ? <img className="team-photo" src={imageUrl(member.photoUrl, 640)} srcSet={imageSources(member.photoUrl, [320, 640, 960])} sizes="(max-width: 760px) 94vw, 240px" {...imageDimensions(member.photoUrl)} alt={`${member.name} aus dem Rudelbar-Team`} loading="lazy" decoding="async" /> : <span className="team-photo-placeholder" aria-hidden="true"><UsersRound size={54} /></span>}</div><h2>{member.name}</h2><p className="team-role">{member.role}</p><p>{member.bio}</p></article>)}</section> : <section className="team-empty">{contentError ? "Das Team konnte gerade nicht geladen werden." : "Das Rudel stellt sich bald vor."}</section>}</>;
}
function ArticleBody({ body, teaser }) {
  const paragraphs = String(body || "").split(/\n\s*\n/).filter(Boolean).filter(text => text.trim() !== String(teaser || "").trim());
  return <div className="post-body">{paragraphs.map((text, index) => {
    if (/^(?:#[\p{L}\p{N}_]+\s*)+$/u.test(text.trim())) return null;
    if (/^#{2,3}\s/.test(text)) return text.startsWith("###") ? <h3 key={index}>{text.replace(/^#+\s/, "")}</h3> : <h2 key={index}>{text.replace(/^#+\s/, "")}</h2>;
    if (text.length < 130 && text === text.toLocaleUpperCase("de-DE") && /[A-ZÄÖÜ]{3}/.test(text)) return <h2 key={index}>{text}</h2>;
    if (/^(?:[-*]\s)/m.test(text) && text.split("\n").every(line => !line.trim() || /^[-*]\s/.test(line))) return <ul key={index}>{text.split("\n").filter(Boolean).map((line, i) => <li key={i}>{line.replace(/^[-*]\s/, "")}</li>)}</ul>;
    return <p key={index}>{text}</p>;
  })}</div>;
}
function PostPage({ post }) {
  const images = (post.images || []).filter(item => isSanityImage(item.url)).map((image, index) => ({ ...image, alt: imageDescription(image, post, index) }));
  return <article className="post-detail"><a className="text-link" href={sitePath("aktuelles/")}>← Alle Beiträge</a><p className="eyebrow gold"><time dateTime={post.date}>{formattedDate(post.date)}</time></p><h1>{post.title}</h1><p className="post-lead">{post.teaser}</p><ArticleBody body={post.body} teaser={post.teaser} />{images.length > 0 && <Gallery images={images} />}<aside className="article-next"><h2>Lust auf einen Rudel Abend?</h2><p>Entdecke unsere Ankündigungen oder plane mit uns einen Abend für deinen Ort.</p><div className="button-row"><a className="button" href={sitePath("termine/")}>Zu den Terminen</a><a className="text-link" href={sitePath("dein-event/")}>Eigenen Abend anfragen</a></div></aside></article>;
}
function BookingPage({ theme }) {
  return <><PageIntro eyebrow="RUDELBAR FÜR DEIN EVENT" title="Ein Abend, der Menschen zusammenbringt." action={<a className="button" href="#event-inquiry">Zum Anfrageformular</a>}>Eine mobile Kneipe für Begegnungen, gute Gespräche und gemeinsame Abende. Erzählt uns von eurem Ort, Verein oder Anlass – wir klären mit euch, wie die Rudelbar dazu passt.</PageIntro><section className="booking-layout"><div className="booking-copy"><LocalImage theme={theme} name="rudelbar-wagen" alt="Der echte schwarz-goldene Rudelbar Wagen" /><p className="eyebrow gold">SO PLANEN WIR GEMEINSAM</p><h2>Von eurer Idee zum Rudel Abend.</h2><ol className="booking-steps"><li><strong>Erzählt uns von eurem Vorhaben.</strong> Ort, Anlass, ein möglicher Termin und eure Wünsche helfen beim Einstieg.</li><li><strong>Wir klären die Möglichkeiten.</strong> Gemeinsam besprechen wir Ausstattung, Gegebenheiten vor Ort und den Rahmen eures Abends.</li><li><strong>Wir stimmen die Details ab.</strong> Leistungen, Ablauf und Konditionen vereinbaren wir persönlich, passend zu eurem Vorhaben.</li></ol><DirectContact /></div><BookingForm eventMode /></section><section className="booking-faq" aria-labelledby="faq-heading"><p className="eyebrow gold">HÄUFIGE FRAGEN</p><h2 id="faq-heading">Was ihr vorab wissen solltet.</h2><details><summary>Kommt die Rudelbar auch zu uns?</summary><p>Schreibt uns euren Ort oder Veranstaltungsort. Wir prüfen mit euch, ob und wie ein Rudel Abend dort möglich ist.</p></details><details><summary>Was bringt die Rudelbar mit?</summary><p>Im Mittelpunkt steht unser mobiler Rudelbar-Wagen mit dem Team dahinter. Welche Ausstattung und welches Angebot zu eurem Anlass passen, besprechen wir gemeinsam.</p></details><details><summary>Was brauchen wir vor Ort?</summary><p>Beschreibt uns euren vorgesehenen Platz und die örtlichen Gegebenheiten. Platzbedarf, Zugang, Versorgung und den Aufbau stimmen wir bei der Planung konkret mit euch ab.</p></details><details><summary>Was kostet ein Rudel Abend?</summary><p>Die Konditionen hängen vom vereinbarten Umfang und eurem Vorhaben ab. Fragt uns mit Ort, Anlass und euren Wünschen an; die weiteren Details klären wir persönlich.</p></details><details><summary>Kann ich schon ohne festen Termin anfragen?</summary><p>Ja. Ort und Wunschtermin sind im Formular optional. Erzählt uns, was ihr vorhabt, auch wenn eure Planung noch am Anfang steht.</p></details></section></>;
}
function NotFound({ loading = false }) {
  return <><PageIntro eyebrow={loading ? "EINEN MOMENT" : "SEITE NICHT GEFUNDEN"} title={loading ? "Wir laden die aktuellen Inhalte." : "Hier ist gerade kein Rudel."}>{loading ? "Die aktuellen Informationen werden abgerufen." : "Diese Seite ist nicht verfügbar oder wurde von der Website genommen."}</PageIntro>{!loading && <section className="not-found-links"><a className="button" href={sitePath()}>Zur Startseite</a><a className="text-link" href={sitePath("termine/")}>Termine ansehen</a><a className="text-link" href={sitePath("kontakt/")}>Kontakt aufnehmen</a></section>}</>;
}

export function App({ initialContent, initialPath, initialTheme = "black" } = {}) {
  const browser = typeof window !== "undefined";
  const [content, setContent] = useState(initialContent || (browser ? window.__RUDELBAR_CONTENT__ : null) || defaultContent);
  const [loaded, setLoaded] = useState(!!initialContent || !!(browser && window.__RUDELBAR_CONTENT__));
  const [contentError, setContentError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const search = new URLSearchParams(browser ? window.location.search : "");
  const previewThemes = search.get("previewThemes") === "1";
  const [theme, setTheme] = useState(initialTheme);
  const pathname = initialPath || (browser ? window.location.pathname : BASE_PATH);
  const route = routeFor(pathname);
  useEffect(() => {
    const controller = new AbortController();
    loadPublishedContent(config, controller.signal).then(next => { setContent(next); setLoaded(true); }).catch(error => { if (error.name !== "AbortError") { setContentError(true); setLoaded(true); } });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const desired = search.get("theme");
    if (previewThemes && ["dusk", "evening", "black"].includes(desired) && desired !== theme) setTheme(desired);
  }, [theme]);
  useEffect(() => {
    const redirect = () => { const next = legacyPath(window.location.hash, content); if (next) window.location.replace(next); };
    redirect(); window.addEventListener("hashchange", redirect);
    return () => window.removeEventListener("hashchange", redirect);
  }, [content]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = event => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);
  useEffect(() => {
    const meta = pageMetadata(route, content, pathname);
    document.title = meta.title;
    const description = document.querySelector('meta[name="description"]'); if (description) description.content = meta.description;
    const robots = document.querySelector('meta[name="robots"]'); if (robots && meta.missing) robots.content = "noindex, follow";
  }, [content, pathname]);

  const posts = content.posts || [];
  const navigation = posts.length ? [...routeNames.slice(0, 3), ["Aktuelles", "aktuelles"], ...routeNames.slice(3)] : routeNames;
  const post = route.page === "beitrag" ? matchContent(posts, route.key) : null;
  const event = route.page === "termin" ? matchContent(content.events || [], route.key) : null;
  let page;
  if (route.page === "start") page = <Home theme={theme} event={nextEvent(content.events || [])} contentError={contentError} posts={posts} />;
  else if (route.page === "termine") { const events = orderedContent(upcomingEvents(content.events || [])); page = <><PageIntro eyebrow="TERMINE" title="Wo sich das Rudel trifft.">Hier findest du die kommenden Rudel Abende mit Datum und Veranstaltungsort.</PageIntro>{events.length ? <div className="event-list">{events.map(item => <EventCard key={item._id} event={item} />)}</div> : <EventPlaceholder error={contentError} />}</>; }
  else if (route.page === "das-rudel") page = <TeamPage team={content.team || []} contentError={contentError} />;
  else if (route.page === "aktuelles" && posts.length) page = <><PageIntro eyebrow="AKTUELLES" title="Neues aus dem Rudel.">Geschichten, Einblicke und Bilder von unterwegs.</PageIntro><section className="post-grid post-list" aria-label="Alle Beiträge">{newestPosts(posts).map(item => <PostCard key={item._id} post={item} />)}</section></>;
  else if (route.page === "beitrag" && post) page = <PostPage post={post} />;
  else if (route.page === "termin" && event) page = <><PageIntro eyebrow="RUDEL ABEND" title={event.title}>{event.date < todayLocal() ? "Dieser Rudel Abend hat bereits stattgefunden." : "Alle Informationen zu diesem Rudel Abend."}</PageIntro><EventCard event={event} detail /><section className="not-found-links"><a className="text-link" href={sitePath("termine/")}>Alle kommenden Abende</a></section></>;
  else if (route.page === "dein-event") page = <BookingPage theme={theme} />;
  else if (route.page === "kontakt") page = <><PageIntro eyebrow="KONTAKT" title="Damit wir gut ins Gespräch kommen.">Du möchtest einen Rudel Abend planen oder hast eine Frage? Schreib uns – wir melden uns bei dir zurück.</PageIntro><section className="contact-layout"><BookingForm /><DirectContact /></section></>;
  else if (["datenschutz", "impressum"].includes(route.page)) page = <article className="legal-main" dangerouslySetInnerHTML={{ __html: route.page === "datenschutz" ? privacy : imprint }} />;
  else page = <NotFound loading={!loaded && ["beitrag", "termin", "aktuelles"].includes(route.page)} />;

  return <div className="site-shell"><a className="skip-link" href="#main-content">Direkt zum Inhalt</a><header className="site-header"><Logo /><nav id="main-navigation" className={menuOpen ? "primary-nav is-open" : "primary-nav"} aria-label="Hauptnavigation">{navigation.map(([label, name]) => <a key={name} href={sitePath(name ? `${name}/` : "")} aria-current={(name || "start") === route.page || name === "aktuelles" && route.page === "beitrag" || name === "termine" && route.page === "termin" ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav><a className="button button-small header-cta" href={sitePath("dein-event/")}>Event anfragen</a><button ref={menuButton} type="button" className="menu-button" aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X aria-hidden="true" size={23} /> : <Menu aria-hidden="true" size={25} />}</button></header><main id="main-content" tabIndex={-1}>{page}</main><footer className="site-footer"><div className="footer-brand"><Logo footer /><p>Für gute Abende und lebendige Dörfer.</p></div><nav className="footer-nav" aria-label="Footer-Navigation"><a href={sitePath("termine/")}>Termine</a><a href={sitePath("das-rudel/")}>Das Rudel</a>{posts.length > 0 && <a href={sitePath("aktuelles/")}>Aktuelles</a>}<a href={sitePath("dein-event/")}>Für dein Event</a><a href={sitePath("kontakt/")}>Kontakt</a></nav><div className="footer-social"><a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Rudelbar auf Instagram öffnen"><InstagramMark />Instagram <ArrowRight size={15} aria-hidden="true" /></a><a className="back-top" href="#main-content">Nach oben <ChevronDown size={16} aria-hidden="true" /></a></div><nav className="footer-legal" aria-label="Rechtliches"><a href={sitePath("impressum/")}>Impressum</a><a href={sitePath("datenschutz/")}>Datenschutz &amp; Cookies</a></nav></footer>{previewThemes && <aside className="theme-switcher" aria-label="Farbvarianten-Vorschau"><span>Farbtest</span>{[["", "Original"], ["dusk", "Dämmerung"], ["evening", "Abend"], ["black", "Schwarz"]].map(([value, label]) => <button key={label} className={theme === value ? "is-active" : ""} type="button" onClick={() => { setTheme(value); const params = new URLSearchParams(window.location.search); params.set("theme", value); window.history.replaceState({}, "", `${window.location.pathname}?${params}`); }}>{label}</button>)}</aside>}</div>;
}
