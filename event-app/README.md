# Rudelbar Backstage und Besucher-App · Live-Stationen und Mitteilungen

Persönliche Backstage-Konten: siehe [Einrichtung und Berechtigungen](../ACCOUNTS.md) und [Prüfnachweis der Ausbaustufe](../ACCOUNTS-VERIFICATION.json). Der Zugang Redaktion bleibt aktiv.

Stand: 1. November 2026. Quellzweig `codex/rudelbar-push-runtime-fix` im Repository `christopherharmszd/rudelbar-2.0`. Diese Erweiterung ist ausschließlich in der Entwicklungsumgebung bereitgestellt.

## Öffnen

- Backstage: https://rudelbar-cms-staging.christopher-harms.workers.dev/abendplan
- Besucher-App: https://rudelbar-app-staging.christopher-harms.workers.dev/

Die bestehende Redaktion und ihr Zugang bleiben erhalten. Die angemeldete Online-Sitzung wurde für den vollständigen Öffnen-/Schließen-Ablauf verwendet. Es wurde kein Passwort geändert. Die ursprüngliche Besucher-Demo bleibt separat erreichbar.

## Bedienung

**Veranstaltungen** zeigt eigenständige Karten mit Datum, Ort, öffentlich/privat und App offen/geschlossen. Neue Abende entstehen direkt im Backstage und erzeugen keinen Webseiten-Termin. Bestehende Webseiten-Termine sind als Ausgangspunkte weiter verfügbar.

Ein Abend hat fünf Arbeitsbereiche: **Übersicht, Angebote, Getränke, Team, Stationen**. Die Übersicht führt zur Begrüßung und zum Gäste-Link. Die langen Gesamtformulare wurden durch getrennte Ansichten und gezielte Bearbeitungsdialoge ersetzt. Auf dem Handy ergänzt eine untere Navigation die Arbeitsbereiche.

**Angebote** verwaltet frei benannte Ausstattung, Spiele, Programmpunkte und Getränke. Namen, Bereiche und Beschreibungen sind editierbar. Für jeden Abend werden Angebote ausgewählt; Ort, Kapazität, Programmzeit, Getränkepreis und Verfügbarkeit werden am ausgewählten Eintrag angepasst. Ausstattung benötigt keine verpflichtende Rundengröße.

**Personen** verwaltet Profile mit Anzeigename, Rolle und optionalen internen Kontaktangaben. Ein Abend erhält ein eigenes Team. Ansprechpersonen werden optional per Dropdown aus diesem Team gewählt und als `hostId` referenziert. Freie Namen werden in neuen Zuordnungen nicht gespeichert. Änderungen am Personenprofil werden über diese Verknüpfung aufgelöst. Die bisherigen Beispiel-Zuordnungen wurden in sechs Personenprofile übernommen.

### App-Zustand und Freigabe

- Ein neu angelegter Abend startet geschlossen.
- Bearbeitungen werden als Entwurf gespeichert.
- **Vorschau ansehen** zeigt den gespeicherten Entwurf innerhalb der angemeldeten Redaktion.
- **App öffnen** übernimmt den aktuellen Entwurf und macht die App für Gäste verfügbar.
- Während die App offen ist, werden spätere Entwurfsänderungen mit **Für Gäste übernehmen** freigegeben.
- **App schließen** zeigt Gästen eine geschlossene Veranstaltung. Inhalte bleiben für die weitere Bearbeitung erhalten.
- Eine Inhaltsfreigabe öffnet einen geschlossenen Abend nicht automatisch.
- Bereits geöffnete Gästeansichten gleichen den Zustand bei Rückkehr in den Browser und alle 30 Sekunden ab. Neue Abfragen beachten den geschlossenen Zustand sofort.

Private Abende erhalten einen eigenen Gäste-Link mit zufälligem Zugangscode. Ohne diesen Link oder eine bereits gültige eigene Besuchersitzung gibt die Besucher-Schnittstelle keine Veranstaltungsdetails zurück. Jeder, der den Link besitzt, kann den geöffneten Abend besuchen. Es handelt sich um einen Einladungslink, nicht um eine persönliche Teilnehmeranmeldung. Private Abende werden nicht als Standardveranstaltung der Besucher-App ausgewählt.

## Daten und Zugriff

Sanity bleibt die redaktionelle Datenhaltung. Neue App-Veranstaltungen (`rudelAppEvent`), Personen (`rudelAppPerson`) und freigegebene App-Fassungen (`rudelAppRelease`) liegen als geschützte Dokumente unter `drafts.*`. Die Anwendung verwendet für diese Typen ausschließlich private Schreiboperationen. Ihre Freigabe in der App ist bewusst unabhängig von Sanitys öffentlicher Veröffentlichung. Die vorhandenen Webseiten-Publish-Routen prüfen ihren Dokumenttyp und können diese privaten Datensätze nicht veröffentlichen.

Die Besucher-App liest freigegebene Inhalte über die interne Cloudflare-Service-Bindung `CONTENT` auf den benannten Einstiegspunkt `VisitorContent` der Staging-Redaktion. Es gibt keine öffentliche HTTP-Schnittstelle für den internen Datendienst. Der Einstiegspunkt liefert ausschließlich die für den konkreten Abend erlaubten Besucherfelder. E-Mail, Telefon und Zugangscode werden nie als Teil der Besucher-Konfiguration ausgegeben. Die öffentliche Sanity-Schnittstelle liefert die geschützten App-Dokumente nicht aus; das wurde auch ohne Token mit der `raw`-Perspektive geprüft.

Der serverseitige Sitzungsschutz und die CSRF-Prüfung der Redaktion bleiben bestehen. Private Schreiboperationen verwenden Sanity-Revisionsbedingungen. Veraltete Änderungen werden mit einer verständlichen Konfliktmeldung abgelehnt. Profile können pausiert werden, ohne sie endgültig zu löschen.

### Wichtige Dateien

- `admin/public/abendplan.js`, `abendplan.css`: Backstage-Oberfläche, Navigation und Dialoge.
- `admin/lib/experience-api.mjs`: geschützte Veranstaltungs-, Angebots- und Personenaktionen.
- `admin/lib/abend-service.mjs`: Datenmodell, Freigaben und sichere Besucheransicht.
- `admin/cloudflare-entry.mjs`: benannter interner Cloudflare-Einstiegspunkt.
- `shared/experience.mjs`: Angebotsvalidierung und kompatibles Lesen der ersten Fassung.
- `event-app/worker.mjs`: öffentliche Leseschnittstelle mit Gäste-Link- und Statusbehandlung.
- `event-app/prepare.mjs`: erzeugt dieselbe native Besucher-App als geschützte redaktionelle Vorschau.

## Prüfung und Bereitstellung

```sh
node --test admin/tests/*.test.mjs event-app/tests/*.test.mjs
node event-app/prepare.mjs
```

Die bisherigen elf Tests bleiben Teil der insgesamt 28 erfolgreichen Tests. Geprüft sind bestehende Redaktionsabläufe, Anmeldung/CSRF, unabhängige private Veranstaltungen, Gäste-Link-Prüfung, öffentliche Datenfilterung, optionale Profilreferenzen, Namensänderungen über Profile, Revisionskonflikte sowie Öffnen/Schließen getrennt von der Inhaltsfreigabe.

28 Backstage-Ansichten wurden bei 320, 390, 768 und 1280 Pixeln ohne horizontales Überlaufen geprüft. Zusätzlich wurden kurze und lange Dialoge auf schmalen Ansichten geprüft. Der lange Anlegedialog wurde so korrigiert, dass die unteren Aktionen vollständig innerhalb des Dialogs liegen. Die Live-Konsole zeigte in den geprüften Ansichten keine Fehler. Dies ist Bildschirmgrößen-Prüfung im Browser, kein Test auf einem physischen iPhone.

Der reale Ablauf wurde mit Sanity-Staging-Daten und anschließend über die Cloudflare-Adressen geprüft: privaten Abend anlegen, Profil zum Team hinzufügen, Profil am Angebot auswählen, App öffnen, Gästeansicht aufrufen, App schließen, geschlossene Gästeansicht prüfen. Der private Beispielabend verbleibt geschlossen. `../LIVE-VERIFICATION.json` dokumentiert HTTP-Prüfungen, ausgelieferte Dateien und Worker-Versionen.

Cloudflare-Konto `87e06345951a028223b167dd69056336`, Sanity-Projekt `uywmld5e`, Dataset `staging`. Aus `admin/` mit `npx --yes wrangler@4.143.1 deploy` zunächst `rudelbar-cms-staging` bereitstellen, anschließend aus `event-app/` die Besucher-App. Die Service-Bindung referenziert den bereits vorhandenen benannten Einstiegspunkt. Die Produktionskonfiguration wurde nicht verändert oder bereitgestellt.

`VISITOR_APP_URL` steuert die Gäste-Links. Eine spätere eigene Domain erfordert keine neue Inhaltsstruktur.

## Live-Betrieb für alle Stationen

Im Bereich **Stationen** lassen sich beliebige Eingänge anlegen. Name, Hinweis, Standort, Verknüpfung mit einem ausgewählten Angebot und zuständige Personen sind editierbar. Es gibt drei Eingabeformen: Musikwunsch, Karaoke-Anmeldung und freie Nachricht. Bar, Technik, Spielebetreuung oder weitere Stationen nutzen denselben vollständigen Nachrichtenablauf. Eine Station kann unabhängig von einem Angebot bestehen. Wird ein verknüpftes Angebot aus dem Abend genommen, wird die zugehörige Station ausgeblendet und die Verknüpfung gelöst. Bisherige Gespräche bleiben erhalten.

**Team → Team-Zugang** erzeugt einen persönlichen Link für eine Person aus dem Abendteam. Er erlaubt nur deren zugeordnete Stationen und gemeinsame Eingänge ohne persönliche Zuordnung. Die Redaktion sieht über **Live** alle Stationen des ausgewählten Abends. Ein Link gilt sieben Tage und kann über **Team-Zugänge verwalten** zurückgenommen werden. Entfernte oder pausierte Personen verlieren den Zugang auch vor Ablauf. Es wird keine E-Mail versendet. Persönliche Links sollten direkt weitergegeben werden und erscheinen nur bei ihrer Erstellung. Nach der Anmeldung verschwindet der geheime Code aus der Adresszeile; die Sitzung liegt in einem geschützten Cookie. Mehrere persönliche Zugänge können in getrennten Tabs nebeneinander verwendet werden.

Die Gäste-App sendet echte Anfragen und zeigt ein eigenes **Postfach**. Musikwünsche, Karaoke-Anmeldungen und Fragen erhalten Status, Antworten und einen Gesprächsverlauf. Gäste können nachfragen oder offene Anfragen zurückziehen. Das Team kann Wartelisten bearbeiten, Einträge vorziehen, übernehmen, abschließen, ablehnen, wieder öffnen und an eine andere Station weitergeben. Interne Notizen sind ausschließlich im Team sichtbar. Stationen können neue Anfragen vorübergehend pausieren; laufende Gespräche bleiben bearbeitbar. Das Team aktualisiert sich alle fünf Sekunden, das geöffnete Gäste-Postfach alle acht Sekunden. Zusätzlich gibt es die unten beschriebenen freiwilligen Push-Mitteilungen.

Neue Anfragen und Gastantworten setzen eine offene Veranstaltung voraus. Nach dem Schließen bleiben eigene Nachrichten lesbar; das Team kann bestehende Anfragen weiterhin bearbeiten. Die Anmeldung benötigt nur den Vornamen. Der Zugriff auf das eigene Postfach ist geräte- und browsergebunden, läuft nach sieben Tagen ab und wird über **Auf diesem Gerät neu anfangen** entfernt. Damit wird die Sitzung beendet; Gesprächsdaten werden dadurch nicht gelöscht. Ein automatischer Löschlauf ist noch nicht eingerichtet.

### Technische Datenhaltung und Betrieb

- Redaktionelle Inhalte und Zuständigkeiten: geschützte Sanity-Staging-Dokumente.
- Laufende Anfragen, Nachrichten, Wartelisten, Stationspausen und persönliche Zugänge: Cloudflare D1 `rudelbar-live-staging`, Binding `LIVE_DB`.
- Migration: `admin/migrations/0001_live_stations.sql`. Vor einer neuen Umgebung mit `wrangler d1 migrations apply rudelbar-live-staging --remote` anwenden.
- Besucherzugriff ausschließlich über die interne Service-Bindung. D1 und Redaktionsschnittstellen sind nicht direkt für Gäste geöffnet.
- Besucher- und Team-Cookies sind `HttpOnly`, `Secure` und `SameSite=Strict`. Schreibzugriffe prüfen die Herkunft, interne Teamaktionen zusätzlich ein Sitzungstoken gegen fremde Formulare.
- Revisionsprüfungen und atomare D1-Transaktionen schützen parallele Statusänderungen und Antworten. Wiederholte Anfragesendungen verwenden einen Schlüssel gegen Duplikate; neue Anfragen und Gastantworten werden begrenzt.
- Persönliche Zugänge und Sitzungen laufen zeitlich ab. Der geheime Anteil wird in D1 nur als Hash gespeichert.

Neue Dateien: `admin/lib/live-service.mjs`, `admin/lib/live-api.mjs`, `admin/public/team.*`, `event-app/public/guest-live.js`. Die bestehende redaktionelle Vorschau zeigt die Formulare; echte Sendungen funktionieren in der geöffneten Gäste-App.

28 automatisierte Tests bestehen. Zusätzlich wurden DJ, Karaoke und eine frei angelegte Spielebetreuung im Browser lokal und über die Cloudflare-Adressen durchgespielt: Anfrage, persönliche Stationszuständigkeit, Status, Teamantwort, interne Notiz und Übergabe bis zum Gäste-Postfach. Zwei parallele persönliche Teamzugänge bleiben getrennt. Neue Live-Ansichten und Stationsdialoge wurden bei 320, 390, 768 und 1280 Pixeln ohne horizontales Überlaufen geprüft. Ein physisches iPhone wurde nicht verwendet. Der private Prüfabend wird anschließend geschlossen; die Testgespräche bleiben nachvollziehbar gespeichert.

Gemeinsame Platzbuchungen, automatische Spiele-Matchings und Besucher-Begegnungsprofile sind weitere eigenständige Funktionsbausteine. Der persönliche Merkzettel reserviert weiterhin keine Plätze. Musik- und Karaoke-Stationen verwalten Wünsche und Anmeldungen; sie steuern keine Musiksoftware.

## Mitteilungen für Gäste und Team

Die **Glocke** öffnet neue Interaktionen und die Einrichtung. Beim ersten Besuch nach der Namenseingabe erscheint eine freiwillige Erklärung mit **Mitteilungen einrichten** und **Später**. Es wird kein Systemdialog ohne Klick ausgelöst. Die Einladung bleibt nach dem Überspringen ausblendbar, die Glocke jederzeit erreichbar. Neue Nachrichten und öffentliche Statusänderungen erhalten einen Zähler, eine Ungelesen-Markierung und bei geöffneter App einen anklickbaren Hinweis. Ein Hinweiston ist optional und muss selbst aktiviert werden.

Ungelesen wird pro Empfänger und Gespräch dauerhaft gespeichert. Nur der tatsächlich geladene Stand wird als gelesen markiert. Eine parallel eingehende neue Nachricht bleibt dadurch ungelesen. Private Teamnotizen erzeugen keine Gäste-Mitteilungen. Team-Mitteilungen folgen den aktuellen Stationszuständigkeiten; zurückgenommene oder abgelaufene Zugänge werden beim Versand erneut geprüft.

Hintergrundmitteilungen benötigen die ausdrückliche Browser-Erlaubnis. Auf iPhone und iPad führt eine Anleitung durch **Teilen → Zum Home-Bildschirm → Rudelbar öffnen → Mitteilungen aktivieren**. Dafür liefern Gäste- und Team-Bereich ein passendes Manifest. Der QR-Einstieg funktioniert auch ohne Installation und Push-Erlaubnis. Blockierte oder nicht unterstützte Mitteilungen werden erklärt; die sichtbaren Hinweise und das Postfach bleiben verfügbar. **Testmitteilung senden** bestätigt die Annahme beim Mitteilungsdienst, nicht die tatsächliche Anzeige auf dem Gerät. Der Nutzer hat nach der Versandkorrektur am 1. November 2026 bestätigt, dass die Testmitteilung auf seinem iPhone ankommt. Ein automatisierter Test auf physischer Hardware wurde nicht durchgeführt.

Push-Mitteilungen enthalten einen allgemeinen Hinweis und einen Rückweg ins Gespräch. Nachrichteninhalte, Namen, private Einladungscodes und Anmeldeschlüssel werden nicht im Push-Text versendet. Eine bestehende Besuchersitzung erlaubt den Rückweg auch bei privaten Abenden. Ohne gültige Sitzung wird der private Inhalt weiterhin geschützt. Die Anmeldung gilt bis zu sieben Tage; das Hinzufügen zum iPhone-Home-Bildschirm und die Übernahme einer vorhandenen Browsersitzung sind noch auf einem echten Gerät zu prüfen. Neue Browser ohne Sitzung müssen sich über ihren Gäste-Link anmelden.

### Versand und Wiederholung

- `admin/migrations/0002_notifications.sql`: Änderungsereignisse, Lesestände und freiwillige Geräteanmeldungen.
- Ereignisse entstehen atomar mit der Anfrage oder Antwort. Veraltete und doppelte Schreibversuche erzeugen keine zusätzlichen Hinweise.
- Web Push verwendet `@block65/webcrypto-web-push` 2.0.0 mit `aes128gcm` und VAPID. Die Schlüssel liegen nur als Cloudflare-Secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` vor; der öffentliche Schlüssel wird zur Anmeldung ausgeliefert. Den privaten Schlüssel bei späteren Deployments beibehalten, damit Geräteanmeldungen gültig bleiben.
- Der erfolgreiche Nachrichtenschreibvorgang stößt den Versand im Hintergrund an. Ein Cloudflare-Zeitplan prüft jede Minute ausstehende Zustellungen. Vorübergehende Fehler werden verzögert erneut versucht. Ungültige oder abgelaufene Mitteilungsendpunkte werden deaktiviert. Ein Lauf verarbeitet bis zu 20 Geräteanmeldungen; größere Rückstände werden durch weitere Läufe abgearbeitet.
- Die Zustellannahme des Browseranbieters ist keine Garantie für eine sichtbare Mitteilung. Betriebssystem-Einstellungen und Fokus-Modi können die Anzeige beeinflussen. Der persistente Ungelesen-Stand bleibt davon unabhängig.
- Es gibt höchstens zehn aktive Geräteanmeldungen je Empfänger und Abend. Ausschalten erfolgt für den konkreten Abend auf dem konkreten Gerät. Die Abmeldung trennt die aktuelle Geräteanmeldung, ohne andere Geräte abzumelden.
- Der Service Worker dient dem Empfang und Öffnen von Mitteilungen. Er speichert keine privaten Veranstaltungsseiten offline.

Die zusätzlichen Tests prüfen unter anderem Empfängertrennung, paralleles Lesen, interne Notizen, Weiterleitung, abgelaufene Zugänge, Wiederholungsversand und Cookie-Migration. Ein echter verschlüsselter Web-Push-Payload wird im Test mit dem Empfängerschlüssel entschlüsselt und seine VAPID-Signatur geprüft. Die Produktionsabhängigkeiten enthalten laut `npm audit --omit=dev` keine bekannten Schwachstellen. Die sichtbare Einrichtung, Glocke und Ungelesen-Ansichten wurden im Browser geprüft; der Systemdialog wurde nicht stellvertretend für den Nutzer bestätigt.

## Referenzen

Die Bedienstruktur greift die geprüften Elbmafia-Backstage-Muster auf: kompakter Kopf, getrennte Arbeitsbereiche, feste Desktopnavigation, mobile Navigation sowie fokussierte Dialoge. Die Rudelbar-Marke bleibt erhalten.

Technische Grundlagen: [Cloudflare Service Binding mit WorkerEntrypoint](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/), [Cloudflare D1](https://developers.cloudflare.com/d1/), [Sanity Drafts und Versionen](https://www.sanity.io/docs/content-lake/drafts-and-versions), [Sanity Token und geschützte Dokumente](https://learn.sanity.build/learn/course/visual-editing-with-next-js/token-handling-and-security).

Web-Push-Grundlagen: [Apple/WebKit](https://webkit.org/blog/13878/), [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [verwendete Web-Push-Bibliothek](https://github.com/block65/webcrypto-web-push).

## Korrektur nach dem iPhone-Test vom 1. November 2026

Der erste echte Test scheiterte serverseitig an `redirect: error`: Diese Fetch-Option wird von Cloudflare Workers nicht unterstützt und löst bereits vor dem Netzwerkzugriff einen Fehler aus. Die vorherigen Node-Tests mit einem ersetzten Transport hatten das nicht erkannt. Der Versand verwendet jetzt `redirect: manual` und lehnt Weiterleitungen ausdrücklich ab. Der Empfänger behält seine Geräteanmeldung auch bei einem fehlgeschlagenen Test. Fehler bekommen eine verständliche Meldung und einen gespeicherten Status. Eine Annahme durch den Mitteilungsdienst wird weiterhin von der tatsächlichen Anzeige auf dem Gerät unterschieden.

`npm run test:push-runtime` im Verzeichnis `admin/` prüft zusätzlich zur normalen Testsuite den echten ausgehenden Fetch in der Cloudflare-Laufzeit. Nur der Zielservice wird lokal ersetzt. Der Test prüft den verschlüsselten 4096-Byte-Payload und die VAPID-Authentisierung sowie das Ablehnen einer Weiterleitung ohne Weitergabe von Zugangsdaten. Dabei wird kein reales Gerät benachrichtigt.

Die Anleitung folgt jetzt dem im Nutzer-Screenshot sichtbaren Safari-Menü: unten rechts „…“, dann „Teilen“, im Teilen-Menü nach unten zu „Zum Home-Bildschirm“, „Als Web-App öffnen“ eingeschaltet lassen und „Hinzufügen“. Sie erscheint als kompakte Schritte ohne leeren Nachrichtenabschnitt und ohne Toneinstellungen vor der Installation.

Referenzen: [Cloudflare Request und Redirect-Modi](https://developers.cloudflare.com/workers/runtime-apis/request/), [Apple: Website in Safari in eine App verwandeln](https://support.apple.com/de-de/guide/iphone/iphea86e5236/ios).
