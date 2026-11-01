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

Die gemeinsame Anmeldeseite `/anmelden` unterstützt persönliche E-Mail-/Passwort-Konten sowie den bisherigen Zugang Redaktion. Nach erfolgreicher Anmeldung führt sie zum ursprünglichen Arbeitsbereich zurück. Rücksprungadressen sind auf bekannte lokale Rudelbar-Oberflächen beschränkt; private Team-Zugangscodes werden nicht übernommen. Die bisherigen Anmeldeformulare bleiben als Übergangsweg verfügbar.

Die gemeinsame Sitzung und serverseitigen Berechtigungen gelten für Redaktion, Backstage und Live. Personen ohne Verwaltungsaufgabe gelangen beim allgemeinen Einstieg zum eigenständigen Live-Bereich. Die Benutzerverwaltung bleibt der Administration vorbehalten. Live behält seine eigene Oberfläche.

Die zuvor vorbereitete externe OIDC-Anmeldung wurde durch eigene Rudelbar-Konten nach dem Prinzip der Elbmafia-Anmeldung ersetzt. Einladungen und Passwort-Links sind funktional; Links können persönlich weitergegeben werden. Für automatischen E-Mail-Versand über `info@rudelbar.de` muss die Administration noch den Postfachzugang direkt in Backstage hinterlegen. Gemeinsames Redaktionspasswort, bestehende Sitzungen und Push-Schlüssel bleiben erhalten. Siehe [Konten und Einrichtung](ACCOUNTS.md) und [aktuellen Prüfbericht](NATIVE-AUTH-VERIFICATION.json).

## Erprobung

Ein unveröffentlichter Prüfeintrag „Prüfung Backstage-Übergang“ wurde im neuen Editor angelegt, in der bisherigen Redaktion bearbeitet und im neuen Editor wieder gelesen. Er ist anschließend archiviert worden und wurde nicht veröffentlicht. Die Veröffentlichung der Produktionswebsite bleibt unberührt.

Die neue Oberfläche schützt ungespeicherte Formulare beim Verlassen, verwendet fokussierte Bearbeitungsdialoge und behält beim Wechsel zu Live den ausgewählten Abend. Responsive Prüfungen umfassen die Navigation und den Webseiteneditor auf 320 und 390 Pixel Breite sowie die Desktopansicht. Prüfbericht: [BACKSTAGE-VERIFICATION.json](BACKSTAGE-VERIFICATION.json).
