# Gäste-Einstieg V1 · Designabnahme, 11. November 2026

final result: passed

Geltung: der implementierte App-Code im isolierten lokalen Backend. Die Online-Abnahme des vollständigen Abends ist separat durch einen bereits vor dem Release vorhandenen Datenabruf-Fehler blockiert. Diese lokale Designabnahme ist kein Nachweis eines funktionierenden Live-Abends.

## Referenz und Nachweise

Ausgewähltes Original `selected-concept-1.png` aus der technischen Übergabe, drei App-Inhaltsbereiche ohne die darüberstehenden Präsentationstitel. Referenz je Spalte 454 × 1028 Bildpixel, für den Vergleich auf 390 × 883 normalisiert. Echte Browseraufnahmen des bestehenden App-Codes, CSS-Viewport 390 × 844; ergänzend 320 × 740 und 1280 × 900. Vollseitenaufnahmen bleiben länger, wenn konfigurierte Inhalte mehr Platz brauchen. Die feste Navigation steht in Vollseitenaufnahmen mitten im Bild; ihre Erreichbarkeit wurde zusätzlich im tatsächlichen Viewport geprüft.

Vergleichsbilder `welcome-comparison.jpg`, `name-comparison.jpg`, `home-comparison.jpg` sowie Einzelaufnahmen liegen im Aufgabenordner `work/qa/`. Die gemeinsame Darstellung von Quelle und Implementierung wurde visuell geöffnet und geprüft. Texte, Formular und Icons waren dabei groß genug lesbar; ein weiterer Detailausschnitt war nicht erforderlich.

## Befunde, Korrekturen und erneute Prüfung

- P2: Das vorhandene quadratische Logo enthält transparenten Freiraum; die erste Darstellung war zu klein. Bildfläche vergrößert, Original unverändert, erneut in allen drei Ansichten geprüft.
- P2: Der automatische Mitteilungsbanner unterbrach die persönliche Begrüßung. Auf der Listen-Startseite entfernt; Einrichtung bleibt über Profil, Glocke und Postfach erreichbar. Erneute Aufnahme geprüft.
- P2: Zu viele gleichrangige Zeilen auf der ersten Startseitenfassung. Weitere Funktionen in den bestehenden Entdecken-Bereich übernommen. Startseite zeigt konfigurierte Spiel-/Programmkategorien, Karte mit Preisen und gegebenenfalls Hilfe sowie Postfach. Alle aktivierten Funktionen bleiben erreichbar; erneuter Vergleich geprüft.
- Keine offenen P0/P1/P2 im lokalen Abnahmeumfang. Echte Geräte- und Live-Abnahme bleiben eigene, ausdrücklich offene Prüfungen.

## Fünf Gestaltungsflächen

Typografie: tatsächliche lokale Bitter-/Source-Sans-3-Dateien; Bitter 600, Buttons Source Sans 3 500/20 px gemäß ausdrücklicher leichterer Gewichtung. Keine Ersatzschrift eingeführt. Berechnete H1-Schrift Bitter und Gewicht 600 geprüft.

Abstände/Layout: gleiche Reihenfolge wie im ausgewählten Einstieg, einspaltig mobil; Desktop-Willkommen mit Foto neben Text. Keine horizontale Überbreite bei 320/390 px und Desktop. Primärziele mindestens 58 px hoch, Startseitenzeilen mindestens 76 px, Eingabe 64 px.

Farben: Night, Altweiß, Gold aus vorhandenen Tokens. Primärbutton berechnet `rgb(253, 195, 0)`. Sichtbarer Tastaturfokus und vorhandene Fehlerfarben erhalten.

Bilder: echtes Logo und vorhandenes Wagenfoto, keine Neugenerierung. Bereitgestellter transparenter Unterstrich visuell geprüft; dekorativer leerer Alternativtext. Das reale Foto ist flacher als im generierten Bild, um den Einstieg auf kleinen Geräten übersichtlich zu halten.

Wortlaut: freigegebene Begrüßung, Namensfrage und persönliche Anrede übernommen. Ort/Datum kommen aus dem Abend; Kategorien aus der Konfiguration. Kein erfundenes fixes Programm, keine Gruppenfunktion, keine neue Einwilligung. Datenschutzlink aus der Konfiguration bzw. bestehender Profilzugang. Claim in Gold nach Brand Guide; diese bewussten Unterschiede zum Bild sind dokumentiert.

## Bedienprüfung

Leeres Pflichtfeld, lokale Anmeldung mit bestätigtem Gastzugang, persönliches Moin, Profil mit aktivem Status, Zurücknavigation, lokaler Reset/Wiedereinstieg, Musikangebot und zugeordnete Stationsaktionen, Memory Wall über Entdecken sowie Backstage-Vorschau geprüft. Eigene Kategorie mit ausgeschalteten Modulen geprüft: nur „Eine Runde zusammen“, keine erfundenen Musik-/Essens-/Hilfszugänge. Karte als Startseite öffnet weiterhin die tatsächliche Karte. Keine Beiträge an reale Dienste abgesendet.
