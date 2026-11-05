import { useState } from "react";
import { CONTACT_EMAIL, CONTACT_PHONE, sitePath } from "./site.js";

export function DirectContact({ phone = true }) {
  return <div className="direct-contact"><p>Lieber direkt Kontakt aufnehmen?</p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{phone && <a href="tel:+4915259574522">{CONTACT_PHONE}</a>}</div>;
}

export function BookingForm({ eventMode = false }) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget, formData = new FormData(form);
    formData.set("access_key", "81cac36f-b95e-490a-b1c0-6b339f6a4302");
    formData.set("subject", eventMode ? "Rudelbar: Event-Anfrage" : "Rudelbar: Kontaktanfrage");
    formData.set("from_name", "Rudelbar Website");
    formData.set("message", String(formData.get("nachricht") || ""));
    formData.delete("nachricht");
    if (eventMode) {
      const location = String(formData.get("ort") || "").trim(), date = String(formData.get("wunschdatum") || "");
      if (location) formData.set("Ort", location);
      if (date) { const [year, month, day] = date.split("-"); formData.set("Wunschtermin", `${day}.${month}.${year}`); }
      formData.delete("ort"); formData.delete("wunschdatum");
    }
    setSending(true); setError(false); setNotice("Deine Anfrage wird gesendet …");
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData, headers: { Accept: "application/json" }, signal: controller.signal });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error("Submission failed");
      form.reset(); setNotice("Danke! Deine Anfrage wurde gesendet. Das Rudelbar-Team meldet sich bei dir zurück.");
    } catch {
      setError(true); setNotice("Das Senden hat nicht geklappt. Deine Eingaben bleiben erhalten. Versuche es erneut oder schreibe uns direkt eine E-Mail.");
    } finally { clearTimeout(timeout); setSending(false); }
  }
  return <form id={eventMode ? "event-inquiry" : "contact-inquiry"} className="booking-form" onSubmit={submit} aria-busy={sending}>
    <p className="form-hint">Name, E-Mail-Adresse und Nachricht sind Pflichtfelder.</p>
    <label>Dein Name oder deine Gruppe<input required name="name" autoComplete="name" maxLength={160} placeholder="Zum Beispiel euer Verein" /></label>
    {eventMode && <><label>Wo soll es stattfinden? (optional)<input name="ort" maxLength={240} placeholder="Ort oder Veranstaltungsort" /></label><label>Wann soll es stattfinden? (optional)<input type="date" name="wunschdatum" /></label></>}
    <label>Deine E-Mail-Adresse<input required type="email" name="email" autoComplete="email" maxLength={254} placeholder="name@beispiel.de" /></label>
    <label>Deine Nachricht<textarea required name="nachricht" rows={5} maxLength={12000} placeholder={eventMode ? "Erzähl uns von eurem Anlass und euren Wünschen." : "Wie können wir euch helfen?"} /></label>
    <input type="checkbox" name="botcheck" tabIndex={-1} aria-hidden="true" style={{ display: "none" }} />
    <button className="button" type="submit" disabled={sending}>{sending ? "Wird gesendet …" : "Anfrage senden"}</button>
    <p className="form-privacy">Mit dem Absenden werden deine Angaben zur Bearbeitung der Anfrage an Web3Forms übermittelt. Mehr dazu unter <a href={sitePath("datenschutz/#kontaktformular")}>Datenschutz &amp; Cookies</a>.</p>
    <div className="form-feedback" aria-live="polite" aria-atomic="true">{notice && <p className={`notice form-send-status${error ? " is-error" : ""}`}>{notice}</p>}{error && <a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>E-Mail an {CONTACT_EMAIL}</a>}</div>
  </form>;
}
