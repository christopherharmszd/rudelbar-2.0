# Rudelbar Backstage und Besucher-App · Iteration 2

Stand: 1. November 2026. Quellzweig `codex/rudelbar-app-iteration2` im Repository `christopherharmszd/rudelbar-2.0`. Diese Erweiterung ist ausschließlich in der Entwicklungsumgebung bereitgestellt.

## Öffnen

- Backstage: https://rudelbar-cms-staging.christopher-harms.workers.dev/abendplan
- Besucher-App: https://rudelbar-app-staging.christopher-harms.workers.dev/

Die bestehende Redaktion und ihr Zugang bleiben erhalten. Die angemeldete Online-Sitzung wurde für den vollständigen Öffnen-/Schließen-Ablauf verwendet. Es wurde kein Passwort geändert. Die ursprüngliche Besucher-Demo bleibt separat erreichbar.

## Bedienung

**Veranstaltungen** zeigt eigenständige Karten mit Datum, Ort, öffentlich/privat und App offen/geschlossen. Neue Abende entstehen direkt im Backstage und erzeugen keinen Webseiten-Termin. Bestehende Webseiten-Termine sind als Ausgangspunkte weiter verfügbar.

Ein Abend hat vier Arbeitsbereiche: **Übersicht, Angebote, Getränke, Team**. Die Übersicht führt zur Begrüßung und zum Gäste-Link. Die langen Gesamtformulare wurden durch getrennte Ansichten und gezielte Bearbeitungsdialoge ersetzt. Auf dem Handy ergänzt eine untere Navigation die Arbeitsbereiche.

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

Private Abende erhalten einen eigenen Gäste-Link mit zufälligem Zugangscode. Ohne diesen Link gibt die Besucher-Schnittstelle keine Veranstaltungsdetails zurück. Jeder, der den Link besitzt, kann den geöffneten Abend besuchen. Es handelt sich um einen Einladungslink, nicht um eine persönliche Teilnehmeranmeldung. Private Abende werden nicht als Standardveranstaltung der Besucher-App ausgewählt.

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

Elf Tests bestehen. Geprüft sind bestehende Redaktionsabläufe, Anmeldung/CSRF, unabhängige private Veranstaltungen, Gäste-Link-Prüfung, öffentliche Datenfilterung, optionale Profilreferenzen, Namensänderungen über Profile, Revisionskonflikte sowie Öffnen/Schließen getrennt von der Inhaltsfreigabe.

28 Backstage-Ansichten wurden bei 320, 390, 768 und 1280 Pixeln ohne horizontales Überlaufen geprüft. Zusätzlich wurden kurze und lange Dialoge auf schmalen Ansichten geprüft. Der lange Anlegedialog wurde so korrigiert, dass die unteren Aktionen vollständig innerhalb des Dialogs liegen. Die Live-Konsole zeigte in den geprüften Ansichten keine Fehler. Dies ist Bildschirmgrößen-Prüfung im Browser, kein Test auf einem physischen iPhone.

Der reale Ablauf wurde mit Sanity-Staging-Daten und anschließend über die Cloudflare-Adressen geprüft: privaten Abend anlegen, Profil zum Team hinzufügen, Profil am Angebot auswählen, App öffnen, Gästeansicht aufrufen, App schließen, geschlossene Gästeansicht prüfen. Der private Beispielabend verbleibt geschlossen. `LIVE-VERIFICATION.json` dokumentiert HTTP-Prüfungen, ausgelieferte Dateien und Worker-Versionen.

Cloudflare-Konto `87e06345951a028223b167dd69056336`, Sanity-Projekt `uywmld5e`, Dataset `staging`. Aus `admin/` mit `npx --yes wrangler@4.143.1 deploy` zunächst `rudelbar-cms-staging` bereitstellen, anschließend aus `event-app/` die Besucher-App. Die Service-Bindung referenziert den bereits vorhandenen benannten Einstiegspunkt. Die Produktionskonfiguration wurde nicht verändert oder bereitgestellt.

`VISITOR_APP_URL` steuert die Gäste-Links. Eine spätere eigene Domain erfordert keine neue Inhaltsstruktur.

## Weiterer Ausbau

Gemeinsame Buchungen, Besucher-Begegnungsprofile, Nachrichtenrouting und eine Team-Inbox sind weiterhin der nächste Funktionsbaustein. Die Personenreferenzen bilden bereits die Grundlage für eindeutige Zuständigkeiten. Der persönliche Merkzettel der Besucher-App bleibt gerätebezogen und reserviert keine Plätze.

## Referenzen

Die Bedienstruktur greift die geprüften Elbmafia-Backstage-Muster auf: kompakter Kopf, getrennte Arbeitsbereiche, feste Desktopnavigation, mobile Navigation sowie fokussierte Dialoge. Die Rudelbar-Marke bleibt erhalten.

Technische Grundlagen: [Cloudflare Service Binding mit WorkerEntrypoint](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/), [Sanity Drafts und Versionen](https://www.sanity.io/docs/content-lake/drafts-and-versions), [Sanity Token und geschützte Dokumente](https://learn.sanity.build/learn/course/visual-editing-with-next-js/token-handling-and-security).
