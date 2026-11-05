# Aktueller Rudelbar-Stand

4. November 2026. Der genehmigte Funktionsumbau ist auf den bestehenden Rudelbar-
Adressen veröffentlicht. Keine Pause, kein Verlust ungesicherter Entwicklung.
Die abschließende Abnahme auf echten iPhones und Android-Geräten ist noch offen;
der Gesamtplan wird deshalb nicht als vollständig abgenommen bezeichnet.

## Online

| Bereich | Version | Geprüfte Quelle |
| --- | --- | --- |
| Backstage und Live | 79a72b90-2a07-41e0-940b-300f987affda | 1d20008fa3434e04e950bd07b99dd08eea05d51d |
| Gäste-App | 96b8d7f7-e5d6-4675-b4f2-9e5c6b98a1d4 | c8f385a03deafed1521835020b516cde1c2a83d0 |

Backstage: https://rudelbar-cms-staging.christopher-harms.workers.dev/backstage#templates

Gäste: https://rudelbar-app-staging.christopher-harms.workers.dev/

Unabhängige Notfallredaktion: https://rudelbar-cms.christopher-harms.workers.dev/

Migrationen bis einschließlich 0015_encounter_reporting.sql sind auf der richtigen
Rudelbar-Datenbank angewendet. Private Medienablage rudelbar-guest-media in EU,
kein öffentlicher R2-Zugang oder aktivierter eigener Medien-Domainzugang.
Der separate WallFeed-Dienst ist an den Rudelbar-Backend-Worker gebunden.

Neue Module bleiben aus, bis sie bewusst mit vollständigen Angaben eingerichtet
und für einen tatsächlichen Abend freigegeben werden. Keine künstlichen Personen,
Abende, Teilnahmen, Gewinne oder Bilder im echten Arbeitsbestand. Die vorhandenen
Beispielprodukte bleiben wie beauftragt erhalten. Gemeinsamer Zugang Redaktion,
persönliche Konten, Mailkonfiguration und unabhängige Notfallredaktion bleiben.

## Geprüft

- 229 automatisierte Tests erfolgreich.
- Native lokale Cloudflare-Laufzeiten für Wall, RPC, D1, R2, WebSockets,
  Gewinnausgabe, Begegnungen, Kontakte und Berichte erfolgreich.
- Ein vollständiger isolierter Abend von den zentralen Standbeziehungen über
  Teilnahme, Betreuung und Schließen bis Bericht/CSV erfolgreich. Keine Namen
  oder privaten Texte in der Auswertung; Bedienmessung ausgeschaltet.
- 66 unabhängige Online-Prüfungen bestätigen tatsächliche Versionen, Dateien,
  Zugriffsgrenzen, unveränderte Konten/Arbeitsdaten/Mail/Anbieterzugang und alle
  Sanity-Revisionen. Geschützte SQL-Sicherungen wurden tatsächlich wiederhergestellt.
- Neue Migrationen zweimal verlustfrei mit frischen tatsächlichen Sicherungen
  geprüft. Vor 0012–0014 bleiben 54 Tabellen unverändert, vor 0015 bleiben 99.
- Browserprüfung mit 390 px sowie Beteiligungsbericht bei 320 px ohne seitlichen
  Seitenüberlauf. Dies ist kein tatsächlicher iPhone-/Android-Test.

Die echte Browser-Anmeldesitzung war bei der Schlussprüfung abgelaufen. Keine
Passwörter oder Konten dafür verändert. Die angemeldeten Bedienprüfungen erfolgten
isoliert; Online-Prüfungen umfassten veröffentlichte Inhalte, Rechtegrenzen und
unveränderte Bestände ohne Einspielen künstlicher Aktivitäten.

## Weiterarbeiten

Zuerst diese Datei und [den Betriebsleitfaden](betrieb-gaeste-app.md) lesen.
Einzelheiten und Belege: [QA am 4. November](qa-2026-11-04.md). Ältere Pausen-
und Wiederaufnahmenotizen beschreiben historische Zwischenstände.

Repository: christopherharmszd/rudelbar-2.0, Zweig
codex/rudelbar-wall-wip-2026-11-03. Der Zweig hat keinen automatischen Worker-Deploy.
Quellcode ist lokal und auf GitHub gesichert. Lokale Original-Commits bleiben
zusätzlich unter ihren Sicherungszweigen erhalten. SQL, Geheimnisse und .qa bleiben
außerhalb des öffentlichen Git. Dokumentations-Commits nach den obigen Quellen
ändern keinen bereits veröffentlichten Anwendungscode.

Für erneute isolierte Prüfung zuerst scripts/isolated-wall-preview.mjs mit
RUDELBAR_QA_PORT=8836 starten, danach scripts/isolated-evening-integration-check.mjs.
Das Prüfsystem enthält ausschließlich flüchtige fiktive Daten, sperrt externe
Zugriffe und versendet keine echten E-Mails oder Push-Mitteilungen.

Als nächster Abnahmeschritt: QR-Einstieg, Name, Angebote und Karte, Teilnahme,
Postfach, Fotoauswahl, Tastatur/kleine Bildschirme sowie Hintergrundmitteilungen
auf tatsächlichen iPhone-/Android-Geräten prüfen. Push auf iOS benötigt die
installierte Web-App und eine eigene Gerätefreigabe. Reale Angebote und ihre
Zweck-/Fristangaben bleiben eine bewusste Entscheidung in Backstage.
