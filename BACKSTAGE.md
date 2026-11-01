# Paralleles integriertes Backstage

## Einstiege

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

## Prüfung und Datenhygiene

Ein unveröffentlichter Prüfeintrag „Prüfung Backstage-Übergang“ wurde im neuen Editor angelegt, in der bisherigen Redaktion bearbeitet und im neuen Editor wieder gelesen. Er ist anschließend archiviert worden und wurde nicht veröffentlicht. Die Veröffentlichung der Produktionswebsite bleibt unberührt.

Die neue Oberfläche schützt ungespeicherte Formulare beim Verlassen, verwendet fokussierte Bearbeitungsdialoge und behält beim Wechsel zu Live den ausgewählten Abend. Responsive Prüfungen umfassen die Navigation und den Webseiteneditor auf 320 und 390 Pixel Breite sowie die Desktopansicht. Prüfbericht: [BACKSTAGE-VERIFICATION.json](BACKSTAGE-VERIFICATION.json).

## Profile und Angebote löschen

Bei Personen gibt es direkt am Profil „Profil löschen“. Die Bestätigung nennt zugeordnete Abende. Das Profil wandert in den Papierkorb und verschwindet aus der Auswahl und Gäste-App. Verknüpfte Benutzerkonten, persönliche Sitzungen, Team-Links, Passwort-Links und interne Push-Zugänge werden deaktiviert. Bestehende Nachrichten und historische Zuordnungen werden nicht gelöscht. Verknüpfte Konten erfordern Administration; das eigene Profil kann nicht selbst gelöscht werden.

Wiederhergestellte Profile bleiben zunächst pausiert und Benutzerkonten deaktiviert. Eine Freigabe erfolgt bewusst über die jeweilige Bearbeitung. Die letzte Zuständigkeit einer Station fällt beim Entfernen einer Person nicht automatisch an das gesamte Team; zunächst sieht nur die Abendleitung diesen Eingang.

Im Angebotsdialog gibt es „Angebot löschen“. Gelöschte Einträge erscheinen unter Angebote → Papierkorb und können wiederhergestellt werden. Angebote mit Zuordnungen in bestehenden Abenden sind vor dem Löschen geschützt. Sie müssen zunächst dort entfernt und die Änderungen übernommen werden. Änderungen und Löschungen prüfen die aktuelle Version, damit parallele Bearbeitungen keine gelöschten Angebote versehentlich zurückholen.

Backstage ist die Arbeitsumgebung. Neue Kataloge starten leer. Tests verwenden isolierte Fixtures und schreiben keine erfundenen Personen, Termine, Angebote oder Preise in diesen Bestand. Am 1. November wurden auf Wunsch die beiden von uns angelegten Beispielabende vom 1. und 7. November aus der aktiven Ansicht genommen und ihre Gästezugänge geschlossen. Die Beispielprodukte bleiben auf ausdrücklichen Wunsch erhalten. Der echte Premierentermin vom 2. Oktober und der Produktions-Datenbestand der Website bleiben unverändert.
