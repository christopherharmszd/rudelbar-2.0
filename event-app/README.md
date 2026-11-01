# Rudelbar Besucher-App · Entwicklungsstand

Stand: 1. November 2026. Die bestehende Demo bleibt eigenständig erhalten. Diese Entwicklung liegt im Branch `codex/rudelbar-app-foundation` des Repositories `christopherharmszd/rudelbar-2.0`.

## Direkt ausprobieren

- Redaktion: https://rudelbar-cms-staging.christopher-harms.workers.dev/abendplan.html
- Besucher-App: https://rudelbar-app-staging.christopher-harms.workers.dev/
- Vorbereiteter Abend: https://rudelbar-app-staging.christopher-harms.workers.dev/?abend=fb726148-0852-44f1-ad77-a4c73c12c595

Die Redaktion übernimmt den bestehenden Cloudflare-Staging-Zugang. Es wurde kein Passwort geändert. Die vollständige Bedienung wurde lokal mit einem ausschließlich lokalen Testzugang und den echten Sanity-Staging-Daten geprüft. Die Anmeldung mit dem bestehenden Online-Passwort wurde in diesem Durchlauf nicht erneut getestet. Öffentliche Inhalte sowie der Schutz der Online-Schnittstellen wurden separat geprüft.

## Angebote verwalten und einen Abend vorbereiten

1. Unter **Angebote verwalten** wiederverwendbare Einträge anlegen. Die Angebotsarten Ausstattung, Spiele, Programmpunkte und Getränke bestimmen die benötigten Angaben. Die konkreten Angebote und ihre Bereiche sind frei bearbeitbar.
2. Ein Angebot auswählen und Name, Beschreibung, Bereich, gegebenenfalls Plätze, Dauer, Getränkepreis oder Bild bearbeiten. Der Bereich ist frei benennbar, zum Beispiel „Nachbarschaft“ oder „Kreativ werden“. Archivierte Angebote werden nicht mehr zur neuen Auswahl angeboten.
3. Unter **Abend vorbereiten** einen vorhandenen Redaktionstermin wählen. Angebote per Checkbox auswählen und für diesen Abend Ort, Ansprechperson, Programmzeit beziehungsweise Getränkepreis ergänzen.
4. **Entwurf speichern**, dann die geschützte native Vorschau öffnen. Änderungen sind dort sichtbar, während Besucher weiterhin die veröffentlichte Fassung sehen.
5. **Veröffentlichen** gibt die Auswahl frei. Der Termin selbst muss ebenfalls veröffentlicht sein. **Aus der App nehmen** entfernt die öffentliche Abendkonfiguration; der Entwurf bleibt erhalten.

Die Kategorieüberschriften entstehen aus den angelegten Angeboten. DJ, Karaoke und Kicker sind vorbereitete Beispiele und keine fest vorgeschriebenen Angebotslisten. Das Dorfquiz im Bereich Nachbarschaft wurde über die Oberfläche neu angelegt, ausgewählt und veröffentlicht. Frühere Abendkonfigurationen können als Vorlage übernommen werden.

## Technischer Aufbau

- `shared/experience.mjs`: erlaubte Datenfelder, Validierung und öffentlich lesbare Abendkonfiguration. Die erste Entwicklungsfassung der Musikmodule wird beim Lesen unterstützt.
- `admin/lib/experience-api.mjs`: geschützte Angebotsverwaltung und Abendplanung mit bestehender Sitzung und CSRF-Prüfung.
- Sanity-Dokumente: `rudelAppCatalog` als nicht öffentlich veröffentlichter Angebotskatalog und `rudelAppExperience` als Entwurf/veröffentlichter Abend. Die vorhandenen `rudelEvent`-IDs verbinden Termin und App.
- Veröffentlichte Angebote werden als Kopie im Abend gespeichert. Änderungen am Katalog verändern einen bereits veröffentlichten Abend erst bei erneuter Veröffentlichung.
- `event-app/worker.mjs`: ausschließlich lesende öffentliche Schnittstelle. Die Abfrage nutzt die veröffentlichte Sanity-Perspektive und berücksichtigt nur veröffentlichte, aktive Termine. Kein Redaktionstoken liegt im Browser.
- `event-app/public`: responsive Web-App ohne Rahmen oder iframe. Der Vorname und der persönliche Merkzettel bleiben pro Abend auf dem jeweiligen Gerät.
- `event-app/prepare.mjs`: erzeugt dieselbe native App unter `/abend-preview/` der Redaktion. Die Inhalte kommen dort ausschließlich aus der geschützten Vorschau-Schnittstelle. Das Cloudflare-Build-Kommando der Staging-Redaktion führt diesen Schritt automatisch aus.

## Entwicklung und Bereitstellung

```sh
node --test admin/tests/*.test.mjs event-app/tests/*.test.mjs
node event-app/prepare.mjs
```

Besucher-App aus `event-app/` mit `npx --yes wrangler@4.143.1 deploy` bereitstellen; Redaktion aus `admin/` mit demselben Befehl. Das Standardziel der Redaktion ist ausschließlich `rudelbar-cms-staging`. Die Produktionskonfiguration wurde nicht verändert oder bereitgestellt.

Cloudflare-Konto: `87e06345951a028223b167dd69056336`. Beide Entwicklungsdienste verwenden das Sanity-Projekt `uywmld5e`, Dataset **staging**. Der bestehende redaktionelle Zugang, Sanity-Schreibschlüssel und Sitzungsschlüssel verbleiben als Worker-Secrets. Die Besucher-App liest veröffentlichte Inhalte des bereits öffentlichen Staging-Datasets ohne Schreibschlüssel.

Die spätere eigene Domain erfordert keine Umstellung der Inhaltsstruktur. `VISITOR_APP_URL` der Redaktion bestimmt die erzeugten Besucherlinks. Die App verwendet für ihre eigenen Dateien und Schnittstellen relative Adressen.

## Geprüft

- Acht automatisierte Tests: bestehender Redaktionsablauf, Anmeldung/Passwortwechsel/Sitzungsschutz, CSRF, Archivierung, neue Abendplanung, erlaubte Angebote/Plätze/Preise, Entwurfstrennung, öffentliche Abfragen und eigene Bereiche/Programmpunkte.
- Reale Sanity-Staging-Daten: Termin angelegt/veröffentlicht; Abend gespeichert/veröffentlicht/wieder gelesen; Getränk angelegt; Karaoke als Entwurf entfernt und nur in der Vorschau verborgen; anschließend wieder veröffentlicht.
- Frei angelegtes Dorfquiz samt eigenem Bereich über die Bedienoberfläche veröffentlicht und in der öffentlichen App geöffnet.
- Persönliches Merken eines Angebots über die öffentliche App geprüft.
- 25 Ansichten der Besucher-App bei 320, 390, 430, 768 und 1280 Pixeln ohne horizontales Überlaufen oder iframe. Angebotsbearbeitung zusätzlich bei 390 und 1280 Pixeln geprüft. Kein Test auf einem physischen iPhone.
- `LIVE-VERIFICATION.json`: öffentliche Endpunkte, gesperrte redaktionelle Daten und Vergleich der tatsächlich ausgelieferten Skripte mit dem lokalen Stand.

## Nächster Entwicklungsschritt

Die jetzige Fassung ist die inhaltliche Grundlage. Gemeinsame Platzbuchungen, Begegnungsprofile, Musikwünsche, Karaoke-Anmeldungen und Nachrichten an eine Team-Inbox sind noch nicht implementiert. Der persönliche Merkzettel reserviert keine Plätze.

Dafür wird eine eigene Laufzeit für den Abend ergänzt: anonyme Besuchersitzungen, veranstaltungsgebundene Profile, verlässliche Kapazitätsbuchungen und eine bearbeitbare Team-Inbox. Redaktionelle Inhalte bleiben in Sanity; Besucher- und Buchungsdaten gehören in eine getrennte Datenhaltung. Rollen für Redaktion und Abendteam sowie ein klarer Abschluss eines Abends werden in diesem Schritt ausgearbeitet.
