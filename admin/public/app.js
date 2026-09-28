const root = document.querySelector("#app");
const state = { configured: false, user: null, section: "events", items: [], selected: null, message: "", error: false, busy: false };
const labels = { events: { title: "Termine", description: "Rudel Abende anlegen, vorbereiten und veröffentlichen.", singular: "Termin" }, team: { title: "Das Rudel", description: "Menschen, Fotos und Beschreibungstexte pflegen.", singular: "Teammitglied" } };
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const safeImg = url => /^(\/seed-assets\/|https:\/\/cdn\.sanity\.io\/images\/)/.test(url || "") ? url : "";

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, { credentials: "same-origin", ...options,
    headers: { ...(options.body && typeof options.body === "string" ? { "Content-Type": "application/json" } : {}), ...(state.user?.csrf ? { "X-CSRF-Token": state.user.csrf } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Die Anfrage konnte nicht abgeschlossen werden.");
  return data;
}

async function start() {
  try {
    const data = await api("session");
    state.configured = data.configured; state.user = data.user;
    if (state.configured && !state.user) renderLogin();
    else await load();
  } catch (error) { root.innerHTML = `<p class="loading">${esc(error.message)}</p>`; }
}

function renderLogin() {
  root.innerHTML = `<main class="login-wrap"><form class="login" id="login-form"><div class="brand-mark">R</div><p class="eyebrow">RUDELBAR REDAKTION</p><h1>Willkommen zurück.</h1><p>Melde dich an, um Termine und das Rudel zu verwalten.</p>${state.message ? `<p class="message error">${esc(state.message)}</p>` : ""}<div class="field"><label for="email">E-Mail</label><input id="email" name="email" type="email" autocomplete="username" required /></div><div class="field"><label for="password">Passwort</label><input id="password" name="password" type="password" autocomplete="current-password" required /></div><button class="primary" type="submit">Anmelden</button></form></main>`;
  document.querySelector("#login-form").addEventListener("submit", async event => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await api("login", { method: "POST", body: JSON.stringify(data) }); state.message = ""; await start(); }
    catch (error) { state.message = error.message; renderLogin(); }
  });
}

async function load() {
  try {
    const data = await api(state.section);
    state.items = data.items || [];
    if (state.selected !== "new" && !state.items.some(item => item._id === state.selected)) state.selected = state.items[0]?._id || null;
    render();
  } catch (error) {
    if (error.message === "Bitte anmelden.") { state.user = null; renderLogin(); }
    else { state.message = error.message; state.error = true; render(); }
  }
}

function status(item) {
  if (!item) return "Neuer Entwurf";
  if (item.draft) return item.published ? "Änderungen offen" : "Entwurf";
  return item.published ? "Veröffentlicht" : "Nicht sichtbar";
}
function pill(item) { const label = status(item); return `<span class="pill ${item?.draft ? "draft" : !item?.published ? "offline" : ""}">${label}</span>`; }
function itemTitle(item) { return state.section === "events" ? item.title : item.name; }
function itemMeta(item) { return state.section === "events" ? `${item.date || "Ohne Datum"} · ${item.venue || "Ohne Ort"}` : item.role || "Ohne Rolle"; }

function render() {
  const info = labels[state.section];
  const selected = state.selected === "new" ? null : state.items.find(item => item._id === state.selected);
  const live = state.items.filter(item => item.published).length;
  const drafts = state.items.filter(item => item.draft).length;
  root.innerHTML = `<div class="shell"><aside class="side"><a class="brand" href="#"><span class="brand-mark">R</span><span><strong>Rudelbar</strong><small>Redaktion</small></span></a><div><p class="side-label">Inhalte</p><nav class="nav" aria-label="Redaktionsbereiche"><button type="button" data-section="events" class="${state.section === "events" ? "active" : ""}">Termine <span>↗</span></button><button type="button" data-section="team" class="${state.section === "team" ? "active" : ""}">Das Rudel <span>↗</span></button></nav></div><div class="side-foot">${state.configured ? "Veröffentlichte Inhalte werden in Sanity gespeichert." : "Lokale Vorschau mit dem aktuellen Rudelbar-Inhalt."}</div></aside><div class="main"><header class="top"><div class="crumb">Rudelbar <span> / </span> <strong>${info.title}</strong></div><div class="account"><span class="avatar">${esc(state.user?.email?.[0]?.toUpperCase() || "R")}</span><span class="email">${esc(state.user?.email || "Vorschau")}</span>${state.user ? '<button id="logout" type="button">Abmelden</button>' : ""}</div></header><div class="content"><div class="page-head"><div><p class="eyebrow">INHALTE VERWALTEN</p><h1>${info.title}</h1><p>${info.description}</p></div><button class="primary" id="new" type="button">+ ${info.singular} hinzufügen</button></div>${!state.configured ? '<div class="banner"><strong>Lokale Vorschau.</strong> Die vorhandenen Inhalte sind hier als Ausgangspunkt sichtbar. Speichern und Veröffentlichen werden aktiv, sobald Sanity und die Anmeldung eingerichtet sind.</div>' : ""}${state.message ? `<p class="message ${state.error ? "error" : ""}" role="status">${esc(state.message)}</p>` : ""}<div class="stats"><div class="stat"><strong>${state.items.length}</strong><span>Einträge insgesamt</span></div><div class="stat"><strong>${live}</strong><span>Veröffentlicht</span></div><div class="stat"><strong>${drafts}</strong><span>Entwürfe / Änderungen</span></div></div><div class="layout"><section class="panel" aria-label="Einträge"><div class="panel-head"><h2>${state.section === "events" ? "Alle Termine" : "Alle Teammitglieder"}</h2><small>${state.items.length} Einträge</small></div><div class="list">${state.items.length ? state.items.map(item => `<button type="button" class="item ${state.selected === item._id ? "selected" : ""}" data-id="${esc(item._id)}">${state.section === "team" && safeImg(item.photoUrl) ? `<img src="${esc(item.photoUrl)}" alt="" />` : `<span class="item-icon">${state.section === "events" ? "◷" : "♙"}</span>`}<span class="item-text"><strong>${esc(itemTitle(item))}</strong><small>${esc(itemMeta(item))}</small></span>${pill(item)}</button>`).join("") : '<div class="empty">Noch keine Einträge. Lege den ersten Inhalt an.</div>'}</div></section><section class="panel" aria-label="Bearbeiten"><div class="edit">${renderForm(selected)}</div></section></div></div></div></div>`;
  bind();
}

function renderForm(item) {
  if (!item && state.selected !== "new") return `<div class="empty">Wähle links einen Eintrag oder lege einen neuen an.</div>`;
  const isEvent = state.section === "events";
  const formTitle = item ? itemTitle(item) : `${labels[state.section].singular} hinzufügen`;
  const disabled = !state.configured ? "disabled" : "";
  const field = (name, label, value, opts = {}) => `<div class="field ${opts.span ? "span" : ""}"><label for="f-${name}">${label}</label>${opts.multiline ? `<textarea id="f-${name}" name="${name}" maxlength="${opts.max || 1200}" ${opts.required ? "required" : ""}>${esc(value)}</textarea>` : `<input id="f-${name}" name="${name}" type="${opts.type || "text"}" value="${esc(value)}" maxlength="${opts.max || 240}" ${opts.required ? "required" : ""} />`}${opts.hint ? `<small>${opts.hint}</small>` : ""}</div>`;
  return `<div class="edit-head"><div><h2>${esc(formTitle)}</h2><p>${item ? status(item) : "Noch nicht gespeichert"}</p></div>${pill(item)}</div><form id="edit-form"><div class="grid">${isEvent ? `${field("title", "Titel", item?.title, { required: true, span: true, max: 120 })}${field("date", "Datum", item?.date, { type: "date", required: true, max: 10 })}${field("time", "Uhrzeit", item?.time, { required: true, max: 80 })}${field("venue", "Ort / Treffpunkt", item?.venue, { required: true, max: 160 })}${field("address", "Adresse", item?.address)}${field("description", "Beschreibung", item?.description, { multiline: true, required: true, span: true })}${field("mapUrl", "Link zur Route", item?.mapUrl, { type: "url", span: true, max: 1000 })}` : `${field("name", "Name", item?.name, { required: true, max: 80 })}${field("role", "Rolle im Rudel", item?.role, { required: true, max: 160 })}${field("bio", "Beschreibung", item?.bio, { multiline: true, required: true, span: true })}${field("order", "Reihenfolge", item?.order ?? state.items.length, { type: "number", max: 3 })}`}</div>${!isEvent ? `<div class="photo-control">${safeImg(item?.photoUrl) ? `<img id="photo-preview" src="${esc(item.photoUrl)}" alt="Teamfoto" />` : '<span class="photo-placeholder" id="photo-placeholder">♙</span>'}<div><strong>Teamfoto</strong><p>JPG, PNG oder WebP · maximal 8 MB</p><input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" ${disabled} /></div></div><input type="hidden" name="photoAssetId" value="${esc(item?.photo?.asset?._ref || item?.photoAssetId || "")}" /><input type="hidden" name="photoUrl" value="${esc(item?.photoUrl || "")}" />` : ""}<div class="actions"><button class="primary" type="submit" ${disabled}>${item ? "Entwurf speichern" : "Entwurf anlegen"}</button>${item && state.user?.role === "publisher" ? `<button class="secondary" type="button" data-action="publish" ${item.draft ? "" : "disabled"}>Veröffentlichen</button><button class="danger" type="button" data-action="unpublish" ${item.published ? "" : "disabled"}>Von Website nehmen</button>` : ""}</div></form>`;
}

function bind() {
  document.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", async () => {
    state.section = button.dataset.section; state.selected = null; state.message = ""; await load();
  }));
  document.querySelectorAll("[data-id]").forEach(button => button.addEventListener("click", () => { state.selected = button.dataset.id; state.message = ""; render(); }));
  document.querySelector("#new").addEventListener("click", () => { state.selected = "new"; state.message = ""; render(); document.querySelector("#edit-form input")?.focus(); });
  document.querySelector("#logout")?.addEventListener("click", async () => { await api("logout", { method: "POST" }); state.user = null; renderLogin(); });
  document.querySelector("#edit-form")?.addEventListener("submit", async event => {
    event.preventDefault(); if (!state.configured || state.busy) return;
    state.busy = true; const form = event.currentTarget;
    try {
      const data = Object.fromEntries(new FormData(form));
      const path = state.selected === "new" ? state.section : `${state.section}/${state.selected}`;
      const result = await api(path, { method: state.selected === "new" ? "POST" : "PUT", body: JSON.stringify(data) });
      state.selected = result.id; state.message = "Entwurf gespeichert. Die öffentliche Website wurde nicht verändert."; state.error = false; await load();
    } catch (error) { state.message = error.message; state.error = true; render(); }
    finally { state.busy = false; }
  });
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", async () => {
    const action = button.dataset.action;
    if (action === "unpublish" && !confirm("Diesen Eintrag von der öffentlichen Website nehmen?")) return;
    try { await api(`${state.section}/${state.selected}/${action}`, { method: "POST" }); state.message = action === "publish" ? "Veröffentlicht in Sanity. Die öffentliche Website liest diese Inhalte erst nach ihrer Anbindung." : "In Sanity nicht mehr veröffentlicht."; state.error = false; await load(); }
    catch (error) { state.message = error.message; state.error = true; render(); }
  }));
  document.querySelector("#photo-upload")?.addEventListener("change", async event => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 8_000_000) { state.message = "Das Bild darf höchstens 8 MB groß sein."; state.error = true; render(); return; }
    try {
      const result = await api("upload", { method: "POST", headers: { "Content-Type": file.type, "X-File-Name": file.name }, body: file });
      document.querySelector('[name="photoAssetId"]').value = result.assetId;
      document.querySelector('[name="photoUrl"]').value = result.url;
      const preview = document.querySelector("#photo-preview") || document.createElement("img");
      preview.id = "photo-preview"; preview.alt = "Neues Teamfoto"; preview.src = result.url;
      document.querySelector("#photo-placeholder")?.replaceWith(preview);
    } catch (error) { state.message = error.message; state.error = true; render(); }
  });
}

start();
