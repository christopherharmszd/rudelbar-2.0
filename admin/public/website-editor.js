export function createWebsiteEditor({root,integrated=false,user=null,section="events",onUnauthorized=()=>{},onSaved=()=>{},onDialogChange=()=>{},onDiscard=async()=>true}){
let alive=true,dirty=false,pendingWrites=0,closing=false;const abort=new AbortController();
const state = { configured: false, user: null, section, view: "active", items: [], selected: null, message: "", error: false, busy: false };
const labels = { events: { title: "Termine", description: "Rudel Abende anlegen, vorbereiten und veröffentlichen.", singular: "Termin" }, team: { title: "Das Rudel", description: "Menschen, Fotos und Beschreibungstexte pflegen.", singular: "Teammitglied" }, posts: { title: "Aktuelles", description: "Geschichten und Bilder aus dem Rudel veröffentlichen. Der Bereich erscheint erst mit dem ersten veröffentlichten Beitrag auf der Website.", singular: "Beitrag" } };
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const safeImg = url => /^(\/seed-assets\/|https:\/\/cdn\.sanity\.io\/images\/)/.test(url || "") ? url : "";
let lastDialogTrigger = null;

function mapsSearchUrl(venue, address) {
  const query = [venue, address].map(value => String(value || "").trim()).filter(Boolean).join(", ");
  if (!query) return "";
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", query);
  return url.toString();
}

async function api(path, options = {}) {
  const writing=!!options.method&&options.method!=='GET';if(writing)pendingWrites++;
  try{
    const response = await fetch(`/api/${path}`, { credentials: "same-origin", ...options,signal:abort.signal,
      headers: { ...(options.body && typeof options.body === "string" ? { "Content-Type": "application/json" } : {}), ...(state.user?.csrf ? { "X-CSRF-Token": state.user.csrf } : {}), ...options.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok){if(integrated&&response.status===401)onUnauthorized();throw Object.assign(new Error(data.error || "Die Anfrage konnte nicht abgeschlossen werden."),{status:response.status});}
    if(writing&&path!=='upload')onSaved();return data;
  }finally{if(writing)pendingWrites--;}
}

async function start() {
  if(integrated){state.user=user;if(state.user.role==='writer')state.section='posts';state.configured=true;await load();return;}
  try {
    const data = await api("session");
    state.configured = data.configured; state.user = data.user;if(state.user?.role==='writer')state.section='posts';
    if (state.configured && !state.user) renderLogin();
    else await load();
  } catch (error) { root.innerHTML = `<p class="loading">${esc(error.message)}</p>`; }
}

function renderLogin() {
  if(!alive)return;if(integrated){onUnauthorized();return;}
  root.innerHTML = `<main class="login-wrap"><form class="login" id="login-form"><div class="brand-mark">R</div><p class="eyebrow">RUDELBAR REDAKTION</p><h1>Willkommen zurück.</h1><p>Melde dich an, um Termine, das Rudel und Aktuelles zu verwalten.</p>${state.message ? `<p class="message error">${esc(state.message)}</p>` : ""}<div class="field"><span class="account-label">Konto</span><strong class="account-name">Redaktion</strong><input name="email" type="hidden" value="redaktion@rudelbar.local" autocomplete="username" /></div><div class="field"><label for="password">Passwort</label><input id="password" name="password" type="password" autocomplete="current-password" required /></div><button class="primary" type="submit">Anmelden</button><a class="privacy-link" href="/datenschutz.html">Datenschutz &amp; Cookies</a></form></main>`;
  root.querySelector("#password")?.focus();
  root.querySelector("#login-form").addEventListener("submit", async event => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await api("login", { method: "POST", body: JSON.stringify(data) }); state.message = ""; await start(); }
    catch (error) { state.message = error.message; renderLogin(); }
  });
}

async function load() {
  try {
    const data = await api(state.section);
    state.items = data.items || [];
    if (state.selected !== "new" && !state.items.some(item => item._id === state.selected)) state.selected = null;
    render();
  } catch (error) {
    if (error.message === "Bitte anmelden.") { state.user = null; renderLogin(); }
    else { state.message = error.message; state.error = true; render(); }
  }
}

function status(item) {
  if (!item) return "Neuer Entwurf";
  if (item.archived) return "Archiviert";
  if (item.draft) return item.published ? "Änderungen offen" : "Entwurf";
  return item.published ? "Veröffentlicht" : "Nicht sichtbar";
}
function pill(item) { const label = status(item); return `<span class="pill ${item?.archived ? "archived" : item?.draft ? "draft" : !item?.published ? "offline" : ""}">${label}</span>`; }
function itemTitle(item) { return state.section === "team" ? item.name : item.title; }
function itemMeta(item) { return state.section === "team" ? item.role || "Ohne Rolle" : item.date || "Ohne Datum"; }

function postImageRow(image) {
  if (!safeImg(image.url)) return "";
  return `<div class="post-image-row" data-asset-id="${esc(image.asset?._ref || image.assetId)}" data-url="${esc(image.url)}">
    <div class="post-image-row-header"><div class="post-image-grab"><span class="post-image-grip" aria-hidden="true">⠿</span><strong class="post-image-position"></strong></div><div class="post-image-order-controls">
      <button type="button" class="move-post-image-up" aria-label="Bild nach oben verschieben">↑</button>
      <button type="button" class="move-post-image-down" aria-label="Bild nach unten verschieben">↓</button>
    </div></div>
    <img src="${esc(image.url)}" alt="" draggable="false" />
    <div class="post-image-fields"><label>Bildbeschreibung für Screenreader (optional)<input class="post-image-alt" maxlength="300" value="${esc(image.alt)}" /><small>Leer lassen: Der Kurztext wird beim Speichern übernommen.</small></label>
      <button type="button" class="use-teaser-for-alt">Kurztext übernehmen</button>
      <label>Bildunterschrift (optional)<input class="post-image-caption" maxlength="240" value="${esc(image.caption)}" /></label>
      <button type="button" class="danger remove-post-image">Bild entfernen</button></div></div>`;
}

function refreshPostImageRows(list) {
  const rows = [...list.querySelectorAll(".post-image-row")];
  rows.forEach((row, index) => {
    row.classList.toggle("is-cover", index === 0);
    row.querySelector(".post-image-position").textContent = index === 0 ? "Titelbild · Bild 1" : `Bild ${index + 1}`;
    row.querySelector(".use-teaser-for-alt").setAttribute("aria-label", `Kurztext als Bildbeschreibung für Bild ${index + 1} übernehmen`);
    const up = row.querySelector(".move-post-image-up");
    const down = row.querySelector(".move-post-image-down");
    up.disabled = index === 0;
    down.disabled = index === rows.length - 1;
    up.setAttribute("aria-label", `Bild ${index + 1} nach oben verschieben`);
    down.setAttribute("aria-label", `Bild ${index + 1} nach unten verschieben`);
  });
}

function actionConfirmation() {
  return `<div class="action-confirmation" id="action-confirmation" role="group" aria-label="Aktion bestätigen" hidden>
    <div><strong id="confirmation-title"></strong><p id="confirmation-description"></p></div>
    <div class="action-confirmation-actions"><button class="danger" id="confirm-action" type="button"></button><button class="secondary" id="cancel-action" type="button">Abbrechen</button></div>
  </div>`;
}

function renderArchiveDetails(item) {
  return `<div class="edit-head"><div><h2 id="dialog-heading">${esc(itemTitle(item))}</h2><p>${esc(itemMeta(item))}</p></div>${pill(item)}</div>
    <div class="archive-detail"><p>Dieser Eintrag ist archiviert und auf der Website nicht sichtbar. Nach dem Wiederherstellen liegt er als Entwurf bereit und kann erneut veröffentlicht werden.</p>${item.archivedAt ? `<small>Archiviert am ${esc(new Date(item.archivedAt).toLocaleDateString("de-DE"))}</small>` : ""}</div>
    <div class="form-footer"><div class="actions"><button class="primary" type="button" data-action="restore" ${state.user?.role === "publisher" ? "" : "disabled"}>Wiederherstellen</button><button class="danger" type="button" data-action="delete" ${state.user?.role === "publisher" ? "" : "disabled"}>Endgültig löschen</button></div>${actionConfirmation()}</div>`;
}

function renderPostForm(item) {
  const disabled = !state.configured ? "disabled" : "";
  const actions = item ? `${item.draft ? `<button class="secondary" type="button" data-action="publish" ${state.user?.role === "publisher" ? "" : "disabled"}>Veröffentlichen</button>` : ""}${item.published ? `<button class="danger" type="button" data-action="unpublish" ${state.user?.role === "publisher" ? "" : "disabled"}>Von Website nehmen</button>` : ""}<button class="secondary" type="button" data-action="archive" ${state.user?.role === "publisher" ? "" : "disabled"}>Archivieren</button>` : "";
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `<div class="edit-head"><div><h2 id="dialog-heading">${esc(item?.title || "Beitrag hinzufügen")}</h2><p>${item ? status(item) : "Noch nicht gespeichert"}</p></div>${pill(item)}</div>
    <form id="edit-form"><div class="form-body"><div class="form-columns"><div class="form-main post-fields">
      <div class="field span"><label for="f-title">Überschrift</label><input id="f-title" name="title" maxlength="120" required value="${esc(item?.title)}" /></div>
      <div class="field span"><label for="f-date">Beitragsdatum</label><input id="f-date" name="date" type="date" required value="${esc(item?.date || localDate)}" /><small>Neuere Beiträge stehen zuerst.</small></div>
      <div class="field span"><label for="f-teaser">Kurztext für die Übersicht</label><textarea id="f-teaser" name="teaser" maxlength="300" required>${esc(item?.teaser)}</textarea></div>
      <div class="field span"><label for="f-body">Beitrag</label><textarea id="f-body" name="body" maxlength="12000" required placeholder="Erzähl die Geschichte. Leerzeilen trennen Absätze.">${esc(item?.body)}</textarea><small>Leerzeilen erzeugen Absätze. Bilder erscheinen als Galerie unter dem Text.</small></div>
    </div><div class="form-aside"><div class="post-image-manager"><strong>Bilder</strong><p>Das erste Bild ist das Titelbild. Bild oder Kartenkopf anfassen und an die markierte Stelle ziehen. Auf dem Handy gehen auch die Pfeile. Bis zu 12 Bilder pro Beitrag.</p>
      <div id="post-images">${(item?.images || []).map(postImageRow).join("")}</div>
      <label class="post-upload-label" for="post-image-upload">Bilder hinzufügen</label><input id="post-image-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple ${disabled} />
      <small>JPG, PNG oder WebP · maximal 8 MB je Bild. Ohne eigene Bildbeschreibung wird der Kurztext verwendet.</small><p id="upload-status" role="status"></p>
    </div></div></div></div>
    <div class="form-footer"><div class="actions"><button class="primary" type="submit" ${disabled}>${item ? "Entwurf speichern" : "Entwurf anlegen"}</button>${actions}</div>${item ? actionConfirmation() : ""}</div></form>`;
}

function render() {
  if(!alive)return;
  const info = labels[state.section];
  const isEvent = state.section === "events";
  const hasArchive = state.section !== "team";
  const selected = state.selected === "new" ? null : state.items.find(item => item._id === state.selected);
  const activeItems = state.items.filter(item => !item.archived);
  const archivedItems = state.items.filter(item => item.archived);
  const visibleItems = hasArchive && state.view === "archived" ? archivedItems : activeItems;
  const live = activeItems.filter(item => item.published).length;
  const drafts = activeItems.filter(item => item.draft).length;
  const list = visibleItems.length ? visibleItems.map(item => `
    <button type="button" class="item ${state.selected === item._id ? "selected" : ""}" data-id="${esc(item._id)}" aria-label="${esc(itemTitle(item))} öffnen">
      ${safeImg(state.section === "posts" ? item.images?.[0]?.url : item.photoUrl) ? `<img src="${esc(state.section === "posts" ? item.images[0].url : item.photoUrl)}" alt="" />` : `<span class="item-icon">${isEvent ? "◷" : state.section === "posts" ? "✎" : "♙"}</span>`}
      <span class="item-text"><strong>${esc(itemTitle(item))}</strong><small>${esc(itemMeta(item))}${state.section === "posts" ? "" : ` · Reihenfolge ${esc(item.order ?? 0)}`}</small></span>
      ${pill(item)}
      <span class="item-chevron" aria-hidden="true">›</span>
    </button>`).join("") : `<div class="empty">${state.view === "archived" && hasArchive ? "Im Archiv liegen noch keine Einträge." : "Noch keine Einträge. Lege den ersten Inhalt an."}</div>`;
  const dialog = state.selected ? `
    <div class="modal-backdrop" id="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-heading">
        <button class="modal-close" id="close-dialog" type="button" aria-label="Dialog schließen">×</button>
        <div class="edit">${state.message ? `<p class="message ${state.error ? "error" : ""}" role="status">${esc(state.message)}</p>` : ""}${renderForm(selected)}</div>
      </section>
    </div>` : "";
  const content=`          <div class="page-head"><div><p class="eyebrow">INHALTE VERWALTEN</p><h1>${info.title}</h1><p>${info.description}</p></div>
            <button class="primary" id="new" type="button">+ ${info.singular} hinzufügen</button>
          </div>
          ${!state.configured ? '<div class="banner"><strong>Lokale Vorschau.</strong> Die vorhandenen Inhalte sind hier als Ausgangspunkt sichtbar. Speichern und Veröffentlichen werden aktiv, sobald Sanity und die Anmeldung eingerichtet sind.</div>' : ""}
          ${state.message ? `<p class="message ${state.error ? "error" : ""}" role="status">${esc(state.message)}</p>` : ""}
          <div class="stats"><div class="stat"><strong>${activeItems.length}</strong><span>Aktive Einträge</span></div><div class="stat"><strong>${live}</strong><span>Veröffentlicht</span></div><div class="stat"><strong>${hasArchive ? archivedItems.length : drafts}</strong><span>${hasArchive ? "Archiviert" : "Entwürfe / Änderungen"}</span></div></div>
          ${hasArchive ? `<div class="entry-tabs" role="group" aria-label="Einträge anzeigen"><button type="button" data-view="active" aria-pressed="${state.view === "active"}" class="${state.view === "active" ? "active" : ""}">Aktiv <span>${activeItems.length}</span></button><button type="button" data-view="archived" aria-pressed="${state.view === "archived"}" class="${state.view === "archived" ? "active" : ""}">Archiviert <span>${archivedItems.length}</span></button></div>` : ""}
          <div class="layout entries-layout">
            <section class="panel" aria-label="Einträge"><div class="panel-head"><h2>${hasArchive && state.view === "archived" ? "Archivierte " + (isEvent ? "Termine" : "Beiträge") : isEvent ? "Aktive Termine" : state.section === "team" ? "Alle Teammitglieder" : "Aktive Beiträge"}</h2><small>${visibleItems.length} ${visibleItems.length === 1 ? "Eintrag" : "Einträge"}</small></div><div class="list">${list}</div></section>
          </div>`;
  root.innerHTML = integrated?`<div class="website-content">${content}</div>${dialog}`:`
    <div class="shell">
      <aside class="side">
        <a class="brand" href="#"><span class="brand-mark">R</span><span><strong>Rudelbar</strong><small>Redaktion</small></span></a>
        <div><p class="side-label">Inhalte</p><nav class="nav" aria-label="Redaktionsbereiche">
          ${state.user?.role!=="writer"?`<button type="button" data-section="events" class="${isEvent ? "active" : ""}">Termine <span>↗</span></button>`:""}
          ${state.user?.role!=="writer"?`<button type="button" data-section="team" class="${state.section === "team" ? "active" : ""}">Das Rudel <span>↗</span></button>`:""}
          <button type="button" data-section="posts" class="${state.section === "posts" ? "active" : ""}">Aktuelles <span>↗</span></button>
          <a href="/abendplan.html" class="abend-nav-link">Abendplanung <span>↗</span></a>
        </nav></div>
        <div class="side-foot">${state.configured ? "Veröffentlichte Inhalte werden in Sanity gespeichert." : "Lokale Vorschau mit dem aktuellen Rudelbar-Inhalt."}<br /><a href="/datenschutz.html">Datenschutz &amp; Cookies</a></div>
      </aside>
      <div class="main">
        <header class="top"><div class="crumb">Rudelbar <span> / </span> <strong>${info.title}</strong></div>
          <div class="account"><span class="avatar">R</span><span class="email">${state.user ? esc(state.user.name||"Redaktion") : "Vorschau"}</span><a class="account-privacy" href="/datenschutz.html">Datenschutz</a>${state.user ? '<button id="logout" type="button">Abmelden</button>' : ""}</div>
        </header>
        <div class="content">
${content}
        </div>
      </div>
    </div>${dialog}`;
  document.body.classList.toggle("dialog-open", Boolean(dialog));
  root.querySelector(integrated?".website-content":".shell").inert = Boolean(dialog);
  if(integrated)onDialogChange(Boolean(dialog));
  bind();
  if (dialog) root.querySelector("#close-dialog")?.focus();
}

async function closeDialog() {
  if (!state.selected||closing||(integrated&&(state.busy||pendingWrites>0))) return;
  if(integrated&&dirty){closing=true;const accepted=await onDiscard();closing=false;if(!accepted)return;}
  state.selected = null;
  state.message = "";dirty=false;
  render();
  if (lastDialogTrigger) root.querySelector(lastDialogTrigger)?.focus();
}

function renderForm(item) {
  if (!item && state.selected !== "new") return `<div class="empty">Wähle einen Eintrag oder lege einen neuen an.</div>`;
  if (item?.archived && state.section !== "team") return renderArchiveDetails(item);
  if (state.section === "posts") return renderPostForm(item);
  const isEvent = state.section === "events";
  const formTitle = item ? itemTitle(item) : `${labels[state.section].singular} hinzufügen`;
  const disabled = !state.configured ? "disabled" : "";
  const field = (name, label, value, opts = {}) => `<div class="field ${opts.span ? "span" : ""}"><label for="f-${name}">${label}</label>${opts.multiline ? `<textarea id="f-${name}" name="${name}" maxlength="${opts.max || 1200}" ${opts.required ? "required" : ""}>${esc(value)}</textarea>` : `<input id="f-${name}" name="${name}" type="${opts.type || "text"}" value="${esc(value)}" ${opts.type === "number" ? 'min="0" max="999" step="1"' : `maxlength="${opts.max || 240}"`} ${opts.required ? "required" : ""} />`}${opts.hint ? `<small>${opts.hint}</small>` : ""}</div>`;
  const orderHint = isEvent ? "Kleinere Zahlen stehen weiter oben. Auf der Startseite zählt das nächste Datum." : "Kleinere Zahlen stehen weiter oben auf der Teamseite.";
  const orderField = field("order", "Reihenfolge", item?.order ?? state.items.length, { type: "number", hint: orderHint });
  const mainFields = isEvent ? `
    ${field("title", "Titel", item?.title, { required: true, span: true, max: 120 })}
    ${field("date", "Datum", item?.date, { type: "date", required: true, max: 10 })}
    ${field("time", "Uhrzeit", item?.time, { required: true, max: 80 })}
    ${field("venue", "Ort / Treffpunkt", item?.venue, { required: true, max: 160 })}
    ${field("address", "Adresse", item?.address)}
    ${orderField}` : `
    ${field("name", "Name", item?.name, { required: true, span: true, max: 80 })}
    ${field("role", "Rolle im Rudel", item?.role, { required: true, span: true, max: 160 })}
    ${orderField}`;
  const photoFields = `<div class="photo-control">${safeImg(item?.photoUrl) ? `<img id="photo-preview" src="${esc(item.photoUrl)}" alt="Teamfoto" />` : '<span class="photo-placeholder" id="photo-placeholder">♙</span>'}<div><strong>Teamfoto</strong><p>JPG, PNG oder WebP · maximal 8 MB</p><input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" ${disabled} /></div></div><input type="hidden" name="photoAssetId" value="${esc(item?.photo?.asset?._ref || item?.photoAssetId || "")}" /><input type="hidden" name="photoUrl" value="${esc(item?.photoUrl || "")}" />`;
  const detailFields = isEvent ? `
    ${field("description", "Beschreibung", item?.description, { multiline: true, required: true })}
    <div class="field map-field">
      <label for="f-mapUrl">Google Maps-Link</label>
      <input id="f-mapUrl" name="mapUrl" type="url" value="${esc(item?.mapUrl)}" maxlength="1000" placeholder="https://maps.app.goo.gl/…" />
      <div class="map-actions">
        <a class="secondary" id="preview-google-maps" href="#" target="_blank" rel="noopener noreferrer" hidden>Karte prüfen</a>
        <button class="secondary" id="refresh-google-map-link" type="button">Aus Adresse neu erstellen</button>
      </div>
      <small>Der Suchlink entsteht automatisch aus Ort und Adresse. Du kannst ihn durch einen kopierten Google-Maps-Link ersetzen. Prüfe die Karte vor dem Veröffentlichen.</small>
    </div>` : `
    ${field("bio", "Beschreibung", item?.bio, { multiline: true, required: true })}
    ${photoFields}`;
  const publicationActions = item ? `${item.draft ? `<button class="secondary" type="button" data-action="publish" ${state.user?.role === "publisher" ? "" : "disabled"}>Veröffentlichen</button>` : ""}${item.published ? `<button class="danger" type="button" data-action="unpublish" ${state.user?.role === "publisher" ? "" : "disabled"}>Von Website nehmen</button>` : ""}${isEvent ? `<button class="secondary" type="button" data-action="archive" ${state.user?.role === "publisher" ? "" : "disabled"}>Archivieren</button>` : ""}` : "";
  return `<div class="edit-head"><div><h2 id="dialog-heading">${esc(formTitle)}</h2><p>${item ? status(item) : "Noch nicht gespeichert"}</p></div>${pill(item)}</div>
    <form id="edit-form"><div class="form-body"><div class="form-columns"><div class="form-main">${mainFields}</div><div class="form-aside">${detailFields}</div></div></div>
    <div class="form-footer"><div class="actions"><button class="primary" type="submit" ${disabled}>${item ? "Entwurf speichern" : "Entwurf anlegen"}</button>${publicationActions}</div>${item ? actionConfirmation() : ""}${state.configured && state.user?.role === "writer" ? '<p class="hint">Die Veröffentlichung übernimmt eine Person mit Veröffentlichungsrecht.</p>' : ""}</div></form>`;
}

function bind() {
  const imageList = root.querySelector("#post-images");
  if (imageList) {
    const teaser = root.querySelector("#f-teaser");
    const updateAltPlaceholders = () => imageList.querySelectorAll(".post-image-alt").forEach(input => {
      input.placeholder = teaser.value.trim() || "Kurztext wird übernommen";
    });
    teaser.addEventListener("input", updateAltPlaceholders);
    refreshPostImageRows(imageList);
    updateAltPlaceholders();
  }
  const mapInput = root.querySelector("#f-mapUrl");
  if (mapInput) {
    const venueInput = root.querySelector("#f-venue");
    const addressInput = root.querySelector("#f-address");
    const preview = root.querySelector("#preview-google-maps");
    let generated = mapsSearchUrl(venueInput.value, addressInput.value);
    let autoManaged = !mapInput.value || mapInput.value === generated;
    const updatePreview = () => {
      let valid = false;
      try { valid = new URL(mapInput.value).protocol === "https:"; } catch { /* Link noch unvollständig. */ }
      preview.hidden = !valid;
      preview.href = valid ? mapInput.value : "#";
    };
    const updateFromAddress = () => {
      generated = mapsSearchUrl(venueInput.value, addressInput.value);
      if (autoManaged) mapInput.value = generated;
      updatePreview();
    };
    venueInput.addEventListener("input", updateFromAddress);
    addressInput.addEventListener("input", updateFromAddress);
    mapInput.addEventListener("input", () => { autoManaged = mapInput.value === generated; updatePreview(); });
    root.querySelector("#refresh-google-map-link").addEventListener("click", () => {
      autoManaged = true;
      updateFromAddress();
      mapInput.focus();
    });
    updateFromAddress();
  }
  root.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", async () => {
    state.section = button.dataset.section; state.view = "active"; state.selected = null; state.message = ""; await load();
  }));
  root.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
    state.view = button.dataset.view; state.selected = null; state.message = ""; render();
  }));
  root.querySelectorAll("[data-id]").forEach(button => button.addEventListener("click", () => {
    lastDialogTrigger = `[data-id="${button.dataset.id}"]`;
    state.selected = button.dataset.id; state.message = ""; render();
  }));
  root.querySelector("#new").addEventListener("click", () => {
    lastDialogTrigger = "#new";
    state.view = "active"; state.selected = "new"; state.message = ""; render();
  });
  root.querySelector("#close-dialog")?.addEventListener("click", closeDialog);
  root.querySelector("#modal-backdrop")?.addEventListener("click", event => {
    if (event.target.id === "modal-backdrop") closeDialog();
  });
  root.querySelector("#logout")?.addEventListener("click", async () => { await api("logout", { method: "POST" }); state.user = null; renderLogin(); });
  root.querySelector("#edit-form")?.addEventListener("submit", async event => {
    event.preventDefault(); if (!state.configured || state.busy) return;
    state.busy = true; const form = event.currentTarget;
    try {
      const data = Object.fromEntries(new FormData(form));
      if (state.section === "posts") {
        data.images = [...form.querySelectorAll(".post-image-row")].map(row => ({
          assetId: row.dataset.assetId, url: row.dataset.url,
          alt: row.querySelector(".post-image-alt").value.trim() || String(data.teaser).trim(),
          caption: row.querySelector(".post-image-caption").value,
        }));
      }
      const path = state.selected === "new" ? state.section : `${state.section}/${state.selected}`;
      const result = await api(path, { method: state.selected === "new" ? "POST" : "PUT", body: JSON.stringify(data) });
      dirty=false;state.selected = result.id; state.message = "Entwurf gespeichert. Die öffentliche Website wurde nicht verändert."; state.error = false; await load();
    } catch (error) { state.message = error.message; state.error = true; render(); }
    finally { state.busy = false; }
  });
  const performAction = async action => {
    if (state.busy) return;
    state.busy = true;
    const button = action === "publish" ? root.querySelector('[data-action="publish"]') :
      action === "restore" ? root.querySelector('[data-action="restore"]') : root.querySelector("#confirm-action");
    if (button) { button.disabled = true; button.textContent = "Wird verarbeitet …"; }
    try {
      await api(`${state.section}/${state.selected}/${action}`, { method: "POST" });
      state.message = {
        publish: "Veröffentlicht. Die Website zeigt den Inhalt nach dem nächsten Laden.",
        unpublish: "Von der Website genommen. Der Eintrag liegt nun als Entwurf unter Aktiv.",
        archive: "Archiviert und von der Website genommen. Du findest den Eintrag unter Archiviert.",
        restore: "Wiederhergestellt als Entwurf. Veröffentliche ihn bei Bedarf erneut.",
        delete: "Eintrag endgültig aus der Redaktion entfernt.",
      }[action];
      dirty=false;state.error = false;
      if (["archive", "restore", "delete"].includes(action)) {
        state.selected = null;
        state.view = action === "archive" ? "archived" : "active";
      }
      await load();
    }
    catch (error) { state.message = error.message; state.error = true; render(); }
    finally { state.busy = false; }
  };
  const confirmation = root.querySelector("#action-confirmation");
  const actions = root.querySelector(".form-footer .actions");
  const confirmations = {
    unpublish: ["Wirklich von der Website nehmen?", "Der Eintrag bleibt als aktiver Entwurf erhalten. Die Website zeigt die Änderung nach dem Neuladen.", "Ja, von Website nehmen"],
    archive: ["Eintrag archivieren?", "Der Eintrag verschwindet sofort von der Website und liegt dann im Archiv. Ungespeicherte Änderungen werden nicht übernommen.", "Ja, archivieren"],
    delete: ["Eintrag endgültig löschen?", "Der Eintrag wird aus der Redaktion entfernt und kann hier nicht wiederhergestellt werden. Hochgeladene Bilddateien können im Medienspeicher verbleiben.", "Ja, endgültig löschen"],
  };
  root.querySelector('[data-action="publish"]')?.addEventListener("click", () => performAction("publish"));
  root.querySelector('[data-action="restore"]')?.addEventListener("click", () => performAction("restore"));
  root.querySelectorAll('[data-action="unpublish"], [data-action="archive"], [data-action="delete"]').forEach(button => button.addEventListener("click", () => {
    const [title, description, label] = confirmations[button.dataset.action];
    root.querySelector("#confirmation-title").textContent = title;
    root.querySelector("#confirmation-description").textContent = description;
    root.querySelector("#confirm-action").textContent = label;
    root.querySelector("#confirm-action").dataset.action = button.dataset.action;
    actions.hidden = true;
    confirmation.hidden = false;
    root.querySelector("#cancel-action").focus();
  }));
  root.querySelector("#cancel-action")?.addEventListener("click", () => {
    confirmation.hidden = true;
    actions.hidden = false;
    root.querySelector(`[data-action="${root.querySelector("#confirm-action").dataset.action}"]`)?.focus();
  });
  root.querySelector("#confirm-action")?.addEventListener("click", event => performAction(event.currentTarget.dataset.action));
  root.querySelector("#photo-upload")?.addEventListener("change", async event => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 8_000_000) { state.message = "Das Bild darf höchstens 8 MB groß sein."; state.error = true; render(); return; }
    try {
      const result = await api("upload", { method: "POST", headers: { "Content-Type": file.type, "X-File-Name": file.name }, body: file });
      root.querySelector('[name="photoAssetId"]').value = result.assetId;
      root.querySelector('[name="photoUrl"]').value = result.url;
      const preview = root.querySelector("#photo-preview") || document.createElement("img");
      preview.id = "photo-preview"; preview.alt = "Neues Teamfoto"; preview.src = result.url;
      root.querySelector("#photo-placeholder")?.replaceWith(preview);
    } catch (error) { state.message = error.message; state.error = true; render(); }
  });
  if (imageList) {
    const changed = () => {
      dirty=true;refreshPostImageRows(imageList);
      root.querySelector("#upload-status").textContent = "Bildreihenfolge geändert. Bitte den Entwurf speichern.";
    };
    imageList.addEventListener("click", event => {
      const row = event.target.closest(".post-image-row");
      if (!row) return;
      if (event.target.closest(".remove-post-image")) { dirty=true;row.remove(); refreshPostImageRows(imageList); return; }
      if (event.target.closest(".use-teaser-for-alt")) {
        const teaser = root.querySelector("#f-teaser");
        if (!teaser.value.trim()) {
          root.querySelector("#upload-status").textContent = "Bitte zuerst einen Kurztext für die Übersicht eingeben.";
          teaser.focus();
          return;
        }
        dirty=true;const alt = row.querySelector(".post-image-alt");
        alt.value = teaser.value.trim();
        alt.focus();
        root.querySelector("#upload-status").textContent = "Kurztext übernommen. Du kannst die Bildbeschreibung noch anpassen.";
        return;
      }
      if (event.target.closest(".move-post-image-up") && row.previousElementSibling) {
        imageList.insertBefore(row, row.previousElementSibling); changed();
      }
      if (event.target.closest(".move-post-image-down") && row.nextElementSibling) {
        imageList.insertBefore(row.nextElementSibling, row); changed();
      }
    });
    let drag = null;
    let scrollFrame = 0;
    const formBody = root.querySelector("#edit-form .form-body");
    imageList.addEventListener("pointerdown", event => {
      const row = event.target.closest(".post-image-row");
      if (!row || !event.isPrimary || event.button !== 0 || event.target.closest("button,input,label,textarea,a")) return;
      if (!event.target.closest(".post-image-row-header, .post-image-row > img")) return;
      drag = { row, pointerId: event.pointerId, x: event.clientX, startY: event.clientY, y: event.clientY, moved: false, target: null, before: true,
        startIndex: [...imageList.children].indexOf(row), previousStatus: root.querySelector("#upload-status").textContent, preview: null };
      row.setPointerCapture(event.pointerId);
    });
    const updateDropTarget = () => {
      if (!drag?.moved) return;
      const otherRows = [...imageList.children].filter(row => row !== drag.row);
      const target = otherRows.find(row => drag.y < row.getBoundingClientRect().bottom) || otherRows.at(-1) || null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const before = drag.y < rect.top + rect.height / 2;
      if (target === drag.target && before === drag.before) return;
      drag.target?.classList.remove("is-drop-before", "is-drop-after");
      drag.target = target;
      drag.before = before;
      target.classList.add(before ? "is-drop-before" : "is-drop-after");
      const targetPosition = target.querySelector(".post-image-position").textContent;
      root.querySelector("#upload-status").textContent = `${before ? "Vor" : "Hinter"} ${targetPosition} ablegen.`;
    };
    const autoScroll = () => {
      if (!drag?.moved) return;
      const rect = formBody.getBoundingClientRect();
      const edge = 70;
      if (drag.y < rect.top + edge) formBody.scrollTop -= Math.min(16, Math.max(0, rect.top + edge - drag.y) / 3);
      if (drag.y > rect.bottom - edge) formBody.scrollTop += Math.min(16, Math.max(0, drag.y - rect.bottom + edge) / 3);
      updateDropTarget();
      scrollFrame = requestAnimationFrame(autoScroll);
    };
    const trackDrag = event => {
      if (!drag || event.pointerId !== drag.pointerId || !drag.row.hasPointerCapture(event.pointerId)) return;
      drag.y = event.clientY;
      if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.startY) < 8) return;
      if (!drag.moved) {
        drag.moved = true;
        drag.row.classList.add("is-dragging");
        const preview = document.createElement("div");
        preview.className = "post-image-drag-preview";
        const thumb = drag.row.querySelector("img").cloneNode();
        thumb.alt = "";
        preview.append(thumb, document.createTextNode(drag.row.querySelector(".post-image-position").textContent));
        document.body.append(preview);
        drag.preview = preview;
        scrollFrame = requestAnimationFrame(autoScroll);
      }
      drag.preview.style.left = `${Math.min(event.clientX + 14, innerWidth - 170)}px`;
      drag.preview.style.top = `${Math.min(event.clientY + 14, innerHeight - 130)}px`;
      updateDropTarget();
    };
    imageList.addEventListener("pointermove", trackDrag);
    const finishDrag = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (event.type === "pointerup") trackDrag(event);
      cancelAnimationFrame(scrollFrame);
      drag.row.classList.remove("is-dragging");
      drag.target?.classList.remove("is-drop-before", "is-drop-after");
      drag.preview?.remove();
      if (event.type === "pointerup" && drag.moved && drag.target) {
        imageList.insertBefore(drag.row, drag.before ? drag.target : drag.target.nextElementSibling);
        if ([...imageList.children].indexOf(drag.row) !== drag.startIndex) changed();
        else root.querySelector("#upload-status").textContent = drag.previousStatus;
      } else if (drag.moved) {
        root.querySelector("#upload-status").textContent = drag.previousStatus;
      }
      drag = null;
    };
    imageList.addEventListener("pointerup", finishDrag);
    imageList.addEventListener("pointercancel", finishDrag);
  }
  root.querySelector("#post-image-upload")?.addEventListener("change", async event => {
    const input = event.currentTarget;
    const files = [...input.files];
    const list = root.querySelector("#post-images");
    const status = root.querySelector("#upload-status");
    const submitButton = root.querySelector('#edit-form button[type="submit"]');
    if (list.children.length + files.length > 12) { status.textContent = "Maximal 12 Bilder pro Beitrag."; input.value = ""; return; }
    if (files.some(file => file.size > 8_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      status.textContent = "Bitte nur JPG, PNG oder WebP bis 8 MB je Bild wählen."; input.value = ""; return;
    }
    input.disabled = true;
    submitButton.disabled = true;
    try {
      for (const [index, file] of files.entries()) {
        status.textContent = `Bild ${index + 1} von ${files.length} wird hochgeladen …`;
        const result = await api("upload", { method: "POST", headers: { "Content-Type": file.type, "X-File-Name": file.name }, body: file });
        list.insertAdjacentHTML("beforeend", postImageRow({ assetId: result.assetId, url: result.url, alt: "", caption: "" }));
        refreshPostImageRows(list);
        list.lastElementChild.querySelector(".post-image-alt").placeholder = root.querySelector("#f-teaser").value.trim() || "Kurztext wird übernommen";
      }
      status.textContent = `${files.length} ${files.length === 1 ? "Bild" : "Bilder"} hochgeladen. Bitte den Entwurf speichern.`;
    } catch (error) { status.textContent = error.message; }
    finally { input.disabled = false; input.value = ""; submitButton.disabled = false; }
  });
}

const keydown=event=>{
  if (!state.selected||document.querySelector("dialog[open]")) return;
  if (event.key === "Escape") { event.preventDefault(); closeDialog(); return; }
  if (event.key !== "Tab") return;
  const focusable = [...root.querySelectorAll('.modal button:not([disabled]), .modal input:not([disabled]), .modal textarea:not([disabled])')];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
};
document.addEventListener("keydown",keydown);
const markDirty=event=>{if(event.target.closest("#edit-form")){dirty=true;if(integrated)root.querySelectorAll('[data-action="publish"]').forEach(button=>{button.disabled=true;button.title="Bitte zuerst den Entwurf speichern.";});}};root.addEventListener("input",markDirty);root.addEventListener("change",markDirty);
const beforeUnload=event=>{if(integrated&&dirty){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",beforeUnload);
return {start,get dirty(){return dirty;},get busy(){return state.busy||pendingWrites>0;},destroy(){alive=false;abort.abort();document.removeEventListener("keydown",keydown);window.removeEventListener("beforeunload",beforeUnload);root.removeEventListener("input",markDirty);root.removeEventListener("change",markDirty);document.body.classList.remove("dialog-open");onDialogChange(false);}};
}
