# Datenschutzprüfung für Rudelbar 2.0

Stand: 29. September 2026. Diese Bestandsaufnahme beschreibt den aktuellen **Staging-Stand**. Die Besucherinformationen liegen in `app/public/datenschutz.html`; die Hinweise zum Anmelde-Cookie und zur Redaktion ausschließlich in `admin/public/datenschutz.html`. Vor dem Wechsel auf `rudelbar.de` müssen Anbieter, Einstellungen und betriebliche Abläufe erneut geprüft werden.

## Im Code bestätigt

| Verarbeitung | Auslöser und Daten | Code |
| --- | --- | --- |
| GitHub Pages | Auslieferung der öffentlichen Staging-Seite; GitHub dokumentiert IP-Protokollierung für Sicherheit | `.github/workflows/pages.yml`, `app/index.html` |
| Sanity | Öffentliche Seite ruft veröffentlichte Termine und Teamprofile per API ab; Teamfotos können vom Sanity-CDN stammen | `app/src/content.js`, `app/src/App.jsx` |
| Web3Forms | Nur nach Absenden des Kontakt- oder Eventformulars: Name/Gruppe, E-Mail, Nachricht, optional Ort und Datum; Anbieter erhält zusätzlich Verbindungsdaten | `app/src/App.jsx` |
| Google Maps | Externer Link, kein eingebettetes Karten-Widget und keine Places API; Datenfluss zu Google erst nach Klick | `app/src/App.jsx`, `admin/public/app.js` |
| Redaktion über Cloudflare | Login, Begrenzung nach IP, Sanity-Schreibzugriffe und signiertes Sitzungscookie `rb_session` mit maximal acht Stunden; Cookie ist `HttpOnly`, `Secure`, `SameSite=Strict` | `admin/worker.mjs` |
| Analyse/Werbung | Im untersuchten Seiten- und Redaktionscode keine eigenen Analyse-, Werbe-, Social-Media- oder Marketing-Skripte bzw. entsprechende Cookies | `app/src`, `admin/public` |

## Primärquellen und Folgen

- [Art. 13 DSGVO](https://eur-lex.europa.eu/legal-content/DE/ALL/?uri=CELEX%3A32016R0679): verlangt unter anderem Verantwortlichen, Zweck, Rechtsgrundlage, Empfänger, Drittlandübermittlungen, Speicherdauer oder Kriterien und Betroffenenrechte. [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html): notwendige Speicherung auf Endgeräten ist von der Einwilligungspflicht ausgenommen. Bei der aktuellen technischen Bestandsaufnahme ist daher kein Banner für optionale Cookies umzusetzen. Ein später ergänzter Dienst muss neu bewertet werden.
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages): GitHub protokolliert die IP-Adresse jedes Pages-Besuchers für Sicherheitszwecke. GitHubs [allgemeine Datenschutzerklärung](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) beschreibt den Anbieter; deren Cookies auf `github.com` sind kein Beleg für Cookies auf unserer Pages-Seite.
- [Web3Forms-Datenschutzerklärung](https://web3forms.com/privacy) vom 13. Juli 2026 und [DPA](https://web3forms.com/dpa): Web3Creative verarbeitet Formularangaben als Auftragsverarbeiter, betreibt den Dienst aus Indien, nennt AWS/Cloudflare/Hetzner und kann IP- und E-Mail-Adressen zum Spamschutz an CleanTalk oder Akismet geben. Einsendungen werden laut Datenschutzerklärung bis zu drei Jahre gespeichert. Der DPA beschreibt eine physische TTL von drei Jahren und eine möglicherweise kürzere *Sichtbarkeit* im Dashboard. Dagegen verspricht die aktuelle [Startseite](https://web3forms.com/) eine einstellbare Aufbewahrung bis hinunter zu sieben Tagen. Die [ältere FAQ](https://docs.web3forms.com/getting-started/faq) behauptet noch, Einsendungen würden gar nicht gespeichert. Diese Aussagen sind nicht deckungsgleich. Bis die tatsächliche Kontoeinstellung und physische Löschung verifiziert sind, ist **maximal drei Jahre** die belastbare Angabe.
- [Sanity-Datenschutzerklärung](https://www.sanity.io/legal/privacy) und [DPA](https://www.sanity.io/legal/dpa): Sanity verarbeitet veröffentlichte Daten, Bilder und technische Zugriffsdaten. Versionsverläufe und CDN-Caches können Löschungen verzögern. Der DPA beschreibt Standardvertragsklauseln für eingeschränkte Drittlandtransfers. Sanitys Cookie- und Marketingabschnitte beziehen sich auf Sanitys eigene Website bzw. Dienste und dürfen nicht ungeprüft auf die Rudelbar-Website übertragen werden.
- [Cloudflare-Datenschutzerklärung](https://www.cloudflare.com/privacypolicy/) und [DPA](https://www.cloudflare.com/cloudflare-customer-dpa/): Cloudflare verarbeitet bei Worker-Zugriffen unter anderem IP- und Verkehrsdaten. [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) können Aufruf- und Fehlerdaten enthalten; neue Worker haben Observability laut Dokumentation standardmäßig aktiviert. Ob und mit welcher Aufbewahrungsfrist es für diesen konkreten Worker aktiv ist, muss im Konto geprüft werden.
- [Google-Datenschutzerklärung](https://policies.google.com/privacy?hl=de): gilt nach dem Wechsel auf Google Maps. Auf der Rudelbar-Seite ist keine Karte eingebettet.
- Die [zuständige Beschwerdestelle in Schleswig-Holstein](https://www.datenschutzzentrum.de/formular/beschwerde.php) ist das Unabhängige Landeszentrum für Datenschutz.

## Vor Produktion mit dem Betreiber klären

1. **Web3Forms-Konto:** Welche Aufbewahrung ist für den verwendeten Formularschlüssel tatsächlich eingestellt? Ist eine kürzere Einstellung eine physische Löschung oder nur eine verkürzte Dashboard-Sichtbarkeit? Empfängeradresse, eingeschaltete Integrationen und Spamfilter im Konto kontrollieren. Möglichst kurze tatsächliche Frist wählen und dokumentieren.
2. **Teamprofile:** Freigabe/Rechtsgrundlage für Name, Rolle, Text und Foto je Person dokumentieren. Den Personen die Informationen zur Veröffentlichung direkt geben und einen Prozess für Änderungen/Widerruf festlegen.
3. **Postfach und interne Löschung:** Zuständigen Mailanbieter, Zugriffskreis und reale Löschfristen für Anfragen erfassen. Gesetzliche Aufbewahrungspflichten für daraus entstehende Geschäfte gesondert berücksichtigen.
4. **Cloudflare:** Worker-Log-Einstellungen und Aufbewahrung im Konto prüfen; unnötige Logs deaktivieren oder reduzieren. Auftragsverarbeitungsbedingungen und Drittlandmechanismen für die verwendeten Anbieter im Betreiberkonto hinterlegen.
5. **Produktionswechsel:** Wenn Website oder Redaktion neue Domains, andere Hoster, Datensätze, Anbieter oder Skripte erhalten, beide Datenschutzhinweise anpassen. Insbesondere GitHub-Pages-Abschnitt und Link zur öffentlichen Datenschutzerklärung in der Redaktion aktualisieren. Nach Deployment tatsächliche Requests und `Set-Cookie`-Header im Browser prüfen.

Dies ist eine technische und quellenbasierte Vorlage. Die endgültige rechtliche Freigabe sollte der Betreiber anhand seiner Vertragsunterlagen und tatsächlichen Einstellungen vornehmen.
