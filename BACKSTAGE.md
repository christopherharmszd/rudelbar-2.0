# Paralleles integriertes Backstage

## Einstiege auf Staging

- **Neues Backstage:** `https://rudelbar-cms-staging.christopher-harms.workers.dev/backstage`
- **Eigenständiger Live-Einstieg:** `https://rudelbar-cms-staging.christopher-harms.workers.dev/live`
- **Bestehende Redaktion:** `https://rudelbar-cms-staging.christopher-harms.workers.dev/`
- **Bestehende Abendplanung:** `/abendplan`, weiterhin erreichbar.
- **Bestehende Stationseingänge:** `/team?abend=…` und persönliche Team-Links, weiterhin erreichbar.

Es wird kein bisheriger Einstieg automatisch abgeschaltet oder auf die neue Oberfläche umgeleitet. Das Konto Redaktion bleibt aktiv. Eine spätere Umstellung des Haupteinstiegs ist ein eigener Schritt nach der Erprobung.

## Gemeinsame Verwaltung

Das neue Backstage bündelt Website (Aktuelles, öffentliche Termine, Das Rudel), Veranstaltungen, Angebote und interne Personen mit Benutzerverwaltung. Die Daten kommen aus den vorhandenen Sanity- und D1-Beständen. Es gibt keinen Datenumzug, keine zweite Kontendatenbank und keine Datenkopie für die neue Oberfläche.

Der Webseiteneditor ist jetzt ein gemeinsamer Baustein (`admin/public/website-editor.js`). Die bisherige Redaktion lädt ihn über ihre bisherige Startdatei und behält ihr Layout, ihre Formulare und ihre Adresse. Das neue Backstage lädt denselben Baustein mit eigenem Rahmen und eigenen, ausschließlich dort geltenden Styles. Das bisherige HTML und die bisherige Stylesheet-Datei werden nicht umgestaltet. Speichern, Bilder, Archiv und Veröffentlichung verwenden in beiden Oberflächen dieselben vorhandenen Schnittstellen.

Live bleibt eine eigenständige Anwendung mit Eingängen, Wartelisten und Gesprächen. Das neue Backstage öffnet sie separat und übergibt den ausgewählten Abend. Live erhält keine Verwaltungsnavigation. Eine berechtigte Person kann über den bestehenden Vorbereitungslink zum selben Abend im neuen Backstage zurückkehren. Die bisherigen direkten Live- und Team-Links funktionieren weiter.

## Anmeldung und Rechte

Die neue gemeinsame Anmeldeseite `/anmelden` führt nach erfolgreicher Anmeldung zum ursprünglichen Arbeitsbereich zurück. Die Rücksprungadresse ist auf bekannte lokale Rudelbar-Oberflächen beschränkt; private Team-Zugangscodes werden nicht übernommen. Der OIDC-Anmeldevorgang speichert dieses Ziel zusammen mit State, Nonce und PKCE und verwendet es erst nach erfolgreicher Prüfung. Die bisherigen Anmeldeformulare bleiben als Übergangsweg verfügbar.

Die gemeinsame Sitzung und die vorhandenen serverseitigen Berechtigungen gelten für Redaktion, Backstage und Live. Das Backstage zeigt nur die passenden Arbeitsbereiche. Personen ohne Verwaltungsaufgabe gelangen beim allgemeinen Einstieg direkt zum eigenständigen Live-Einstieg. Die Benutzerverwaltung liegt weiterhin nur bei der Administration.

Der gemeinsame Zugang Redaktion ist funktional. Persönliche Konten und Rollen sind vorbereitet, ihre Anmeldung ist noch nicht aktiviert. Bisher wurde dafür eine OIDC-Anbindung vorgesehen; Auth0 ist ein Vorschlag und keine Voraussetzung. Als Alternative wurde am 1. November der vorhandene Elbmafia-Code geprüft: eigene zentrale Passwortanmeldung, Einladungs- und Resetlinks sowie gemeinsame Konten für Studio und Backstage. Dieses Verfahren kann mit eigenständigen Rudelbar-Konten und eigenem Versand angepasst werden; es wurde in dieser Ausbaustufe noch nicht übernommen. Siehe [Konten und Einrichtung](ACCOUNTS.md). Diese Umstellung aktiviert keinen externen Dienst und verändert keine bestehenden Passwörter, Sitzungsschlüssel oder Push-Schlüssel.

## Erprobung

Ein unveröffentlichter Prüfeintrag „Prüfung Backstage-Übergang“ wurde im neuen Editor angelegt, in der bisherigen Redaktion bearbeitet und im neuen Editor wieder gelesen. Er ist anschließend archiviert worden und wurde nicht veröffentlicht. Die Veröffentlichung der Produktionswebsite bleibt unberührt.

Die neue Oberfläche schützt ungespeicherte Formulare beim Verlassen, verwendet fokussierte Bearbeitungsdialoge und behält beim Wechsel zu Live den ausgewählten Abend. Responsive Prüfungen umfassen die Navigation und den Webseiteneditor auf 320 und 390 Pixel Breite sowie die Desktopansicht. Prüfbericht: [BACKSTAGE-VERIFICATION.json](BACKSTAGE-VERIFICATION.json).
