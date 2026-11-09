# Rudelbar Freigabevorschau · Entwurf 11

Stand: 9. November 2026. Öffentliche Gestaltungsprüfung, keine Produktionsfreigabe.
https://christopherharmszd.github.io/rudelbar-2.0/freigabe/

Entwurf 11 ergänzt auf ausdrücklichen Wunsch „Fragen“ im Hauptmenü auf Desktop und mobil. Die FAQ-Suche durchsucht Fragen und Antworten, öffnet passende Antworten und stellt beim Leeren den vorherigen Aufklappzustand wieder her. Der Footer ordnet die bestehenden Inhalte in Marke, direkte Kontaktwege und Fragen/Instagram; Rechtliches bleibt separat. Keine neuen Footer-Inhalte oder Symbole. Diese Entscheidung ersetzt die Desktop-Sechs-Punkte-Regel aus Nachtrag 2. [Prüfung und Umfang](../../docs/review-11-2026-11-09.md).

Entwurf 10 setzt den Website-Nachtrag 2 V1.1 um: die neue Seite Fragen, bereinigte eigene Texte, Seitentitel und Teilenvorschau, Formularzustände nach Vorgabe sowie entfallene Orts-/Datums-Bildunterschriften. Desktop bleiben sechs Menüpunkte; mobil kommt Fragen zuletzt hinzu. Die restliche Gestaltung bleibt wie in 09. Die Fragen liegen als strukturierte Einträge mit Bereich, Reihenfolge und Ausblendung vor. [Abnahme und offene Integration](../../docs/review-10-2026-11-09.md).

Entwurf 09 entfernt die zusätzlich eingefügten Pfeilsymbole aus externen Presseverweisen auf Startseite und Rudelgeschichten.

Entwurf 08 ergänzt den Menüpunkt „Start“ als ersten Eintrag auf Desktop und mobil. Er führt von jeder Unterseite nach Hause und ist auf der Startseite als aktiv markiert. Die übrige Gestaltung entspricht 07.

Entwurf 07 korrigiert die Rückmeldung zu 06: Der Einstieg mit dem Vorlagenwortlaut und der eigenständige große Terminblock stammen aus 04. Die Kartenüberschrift „Gemeinsam für lebendige Dörfer.“ ist linksbündig. Die Dachzeile lautet „Das Rudel zieht von Ort zu Ort“, der Termin „Nächster Rudelabend“. Die kompakten Einstiegsbuttons und die ausdrücklich gewünschten Kürzungen aus 06 bleiben erhalten.

GTM-/Brand-Guide und Website-Textvorlage sind zusammen mit den späteren ausdrücklichen Entscheidungen der verbindliche Maßstab. Die positive Startseitenbewertung im Audit zu 06 wurde zurückgezogen. Technische Funktion und weniger Scrollen ersetzen keine Prüfung der Gewichtung oder eine gestalterische Freigabe.

## Betrieb und Grenzen

Nur der Staging-Workflow kopiert diese Dateien nach app/dist/client/freigabe. Der Produktions-Build übernimmt sie nicht. Produktion, Domains, Worker, Zugangswerte und CMS bleiben unverändert. Daten sind eingefroren; Formulare versenden nichts. Studio und Zustandsauswahl speichern ausschließlich im jeweiligen Browser. Presseverweise sind fest hinterlegt; echte CMS-Kurztextpflege, Fragenpflege und Medien-Beitragstyp bleiben vor Integration erforderlich. Erfolg und Sendefehler lassen sich unter „Entwurf & Zustände“ gezielt simulieren. Der Datenschutzhinweis kommt vom Team; sein Textplatzhalter wird nicht veröffentlicht. Die Vorschau bleibt noindex. Seitentitel werden je Hash-Ansicht aktualisiert, Teilenvorschauen ohne JavaScript verwenden den Startseitentitel. Statische Metadaten je echter URL sind bei der späteren Integration zu übernehmen.

Die App hat nach ausdrücklicher Entscheidung eine eigene Seite und das Label Early Access. Navigation: Start → Für euren Ort → Rudelbar-App → Termine → Rudelgeschichten → Über uns → Fragen, auf Desktop und mobil. Allgemeines Gastformular in du-Form; Ortsanfrage in ihr-Form. Versorgung mit Strom und Frischwasser über Schlauchleitung bleibt enthalten. Der veröffentlichte Rückblick bleibt erhalten; das ungeklärte dritte Motiv ist ausgeschlossen.

## Vergleich

Versionen 02–11 bleiben über die Vergleichsleiste und feste Links erreichbar. Historische Inhalte und gemeinsam verwendete Assets sind durch revision-locks.json geschützt. Neue Revisionen überschreiben keine alten Inhaltsstände. Die tatsächliche öffentliche Ausgabe ist nach dem Deployment zu prüfen. Die Designentscheidung liegt beim Inhaber.
