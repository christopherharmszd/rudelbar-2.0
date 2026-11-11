# Gäste-Einstieg V1 · 11. November 2026

## Umfang

Willkommen, Namenseingabe und Listen-Startseite der bestehenden App folgen dem vom Inhaber ausgewählten Entwurf V1, mit ausdrücklich leichteren echten Markenschriften. Goldene Unterstreichungen bleiben erhalten. Logo und Wagenfoto sind die vorhandenen Originale. Keine zweite App und keine separate klickbare Vorschau.

Die Startseite zeigt ein persönliches Moin, eine gemeinsame Einladung und ruhige Zeilenzugänge zu den tatsächlichen Spiel-/Programmkategorien, der Karte mit Preisen und gegebenenfalls der Hilfe. Weitere konfigurierte Funktionen sind über den bestehenden Entdecken-Bereich erreichbar; das Postfach bleibt direkt erreichbar, wenn der Abend entsprechende Funktionen anbietet. Physische Ressourcen erscheinen nicht als eigene Startseitenangebote, bleiben aber über Angebote und Karte zugänglich. Kategorien werden aus der Abendkonfiguration übernommen.

Die freigegebenen Texte ersetzen die bisherige Willkommensdarstellung; vorhandene redaktionelle Felder werden nicht gelöscht. Namenseingabe verwendet weiterhin `account.login` und die echte Sitzungsprüfung. Private Linkparameter, Gastzugang, Merkzettel, Profil, Mitteilungen, Freigaben, Wall-Entwürfe und Stationszuordnung behalten ihre bisherigen Mechanismen. Die Einstellung Karte als Startseite bleibt erhalten.

Keine Änderungen an Website, Backendlogik, Datenbankschema oder realen Inhalten. Keine Gruppen- oder Nachrichtenfunktion vorgezogen. [Fachliche Ergänzung des Inhabers](guest-platform-target-2026-11-11.md) bleibt Zielbild, kein Nachweis bereits implementierter Funktionen. Designentscheidungen A12–A14 stehen im [App-Brand-Protokoll](app-brand-2026-11-10.md).

## Prüfung

258 vorhandene Tests bestanden, geändertes JavaScript syntaktisch geprüft. Isolierter vollständiger Gesamtabend erfolgreich: DJ, Karaoke, Hilfe, Spielrunde, Wall einschließlich Mitteilungs-/Sitzungserhalt, fiktive Gewinnaktion, Begegnungen, betreute Runde, Schließen und aggregierter Bericht. Echte Daten sind nicht mit dem isolierten Server verbunden.

Browserabnahme in der bestehenden App bei 320/390 px und Desktop: Willkommen, Pflichtfeld, Anmeldung, persönliche Startseite, Profil, Navigation, weitere Funktionen, lokaler Neustart und authentifizierte Backstage-Vorschau. Eigene Kategorie bei abgeschalteten Modulen und Karte als Startseite zusätzlich geprüft. Lokaler Bildvergleich einschließlich korrigierter Logo- und Startseitengewichtung bestanden; siehe `design-qa.md`.

## Bereits vor der Veröffentlichung bestehender Online-Blocker

Backstage zeigt „API Requests quota limit reached“ von Sanity. Der vorhandene private Gästezugang liefert HTTP 503 mit „Der Abend kann gerade nicht geladen werden.“ Dieser Zustand ist vor der Veröffentlichung erfasst; ein Code-Release hebt das Anbieterlimit nicht auf. Weder Tarif noch Konten oder Daten wurden dafür geändert.

Erfolgreiche Dateiauslieferung und Worker-Deployment müssen getrennt von einer vollständigen sichtbaren Online-Abnahme berichtet werden. Letztere bleibt offen, bis die Abenddaten wieder verfügbar sind. Echte iPhone-/Android-Abnahme bleibt ebenfalls offen.

## Veröffentlichung und Rückweg

Beide bestehenden Worker gehören zusammen: Gäste-App und synchronisierte Backstage-Vorschau. Vorheriger Stand: Backstage `ca0bb36b-b4a9-44c0-aa28-22ff69a160ce`, Gäste-App `5a5d6b90-4795-4469-9b2a-f4a1d8cae938`. Vorher-/Nachher-Bindungen und ausgelieferte Dateien werden abgeglichen. Website bleibt auf `c5178a1b099fad1d7baee4013921d891925b1038`. Bei einem gezielten Code-Rückweg keine Inhalte oder Daten zurücksetzen.
