# Mobile App-Korrekturen · 11. November 2026

Wiederaufnahme des ausdrücklich gesicherten Pausepunkts vom 10. November. Umfang: die drei gemeldeten App-Probleme; keine neue Website-Gestaltung und keine Änderung an öffentlichen Terminen, Konten, Rechten oder echten Gäste-Inhalten.

## App-Symbole und Teilen

Das unveränderte Originallogo erhält separate, deckende Ausgabedateien auf Night `#0D0D0D`: 180, 192 und 512 px, zusätzlich eine maskierbare 512-px-Fassung. Apple-Touch-Verweise sowie Gäste- und Live-Manifeste verwenden diese Dateien. Das Teilen-Bild ist ein deckendes JPEG mit 1200×630 px. Die HTML-Einstiege liefern Open-Graph-/Twitter-Verweise; private Veranstaltungsangaben und Zugangscodes werden nicht in die Bilddatei oder statische Metadaten übernommen. Ein privater Manifest-Startlink behält seinen Zugangsteil.

Generierung: `scripts/prepare-app-icons.mjs` aus dem bestehenden Original mit den vorhandenen Sharp-Abhängigkeiten. Die originale Logo-Datei bleibt erhalten. Bereits installierte Symbole und gespeicherte Messenger-Vorschauen können einen eigenen Cache besitzen; neue Dateinamen sind kein Beweis für eine automatische Aktualisierung auf fremden Geräten.

## Mitteilungen als Einrichtung

Gemeinsame Quelle für Gäste und Live-Team, drei Schritte:

1. Hinweiston ein- oder ausschalten und separat anhören. Ein Testton verändert die Auswahl nicht.
2. Freiwillige Hintergrundmitteilungen. Die Installationsanleitung erscheint nur auf iPhone/iPad außerhalb der installierten Web-App. Andere Plattformen erhalten keine iPhone-Anleitung. Nicht unterstützte, nicht konfigurierte oder blockierte Mitteilungen werden verständlich erklärt; die Einrichtung kann trotzdem abgeschlossen werden.
3. Übersicht über den tatsächlichen Zustand und Abschluss. Ein angenommener Push-Versand wird nicht als bewiesene Zustellung ausgegeben.

Die Glocke öffnet zuerst das Postfach. Die Einrichtung ist über „Einstellungen ändern“ erreichbar. Bestehende Ton-Einstellungen und Abonnements bleiben erhalten. Native Erlaubnis wird ausschließlich nach dem bewussten Aktivierungsbutton angefragt. Polling erhält den Scrollstand des Dialoginhalts; Schrittwechsel fokussieren die neue Überschrift.

## Memory Wall

Separate Buttons öffnen Kamera oder Bildauswahl. Nur der Kameraeingang hat `capture="environment"`; die Mediathek wird nicht mehr durch diesen Parameter auf die Kamera eingeschränkt. Die fehlende Vorschau wurde durch eine fehlende `blob:`-Bildquelle in der Gäste-CSP verursacht. Die Ergänzung beschränkt sich auf Bilder; Skript- und Netzwerkquellen werden nicht erweitert.

Das Formular zeigt die Vorbereitung des Bildes an. Vorschau-JPEGs werden vor dem Upload von optionalen Metadaten bereinigt. Ein anderes oder entferntes Bild erhält eine neue Versandkennung. Entfernen bewahrt den Textentwurf. Vorschau, Lauftext, Links und Checkboxen haben passende Maße und Farben. Hover-Effekte gelten nur bei Hover-fähigen Eingabegeräten. Der Dialog verwendet einen getrennt scrollenden Inhalt; die Formularabstände greifen als Grid.

## Nachweise

- 243 automatisierte Tests erfolgreich; fünf neue Tests für Plattformzustände, private Manifest-Startlinks, deckende PNGs und begrenzte Bildquellen.
- Isolierter vollständiger Abend mit zwei fiktiven Gästen: DJ, Karaoke, Hilfe, Spielrunde, Wall-Moderation, fiktive Gewinnaktion, gegenseitige Begegnung, betreute Runde, Schließen und aggregierter Bericht erfolgreich. Keine Produktionsdaten verwendet.
- Lokaler Browser mit echten Produktions-Sicherheitsregeln: Gäste- und Team-Wizard, Tonwahl/Weiter/Abschluss/erneutes Öffnen, separates Postfach, JPEG-Vorschau 1200×630, tatsächlicher Foto-Upload mit Bildanzeige unter „Meine Momente“, PNG-Vorschau 512×512, Entfernen mit erhaltenem Text erfolgreich.
- Bei 390 px keine horizontale Überbreite; beide Wall-Checkboxen 21×21 px ohne Schrumpfen, beide Foto-Buttons Altweiß auf dunkler Fläche. Keine CSP-Bildfehler im beobachteten Ablauf.
- Schwarze Bildausgaben visuell kontrolliert. Quellcode-Diff ohne Whitespace-Fehler.

Echte iPhone-/Android-Abnahme bleibt offen, besonders native Kamera/Mediathek, Installation, Caches und Push-Zustellung bei geschlossener App. Desktop-Browserprüfungen ersetzen diese Abnahme nicht.

## Veröffentlichung

Noch ausstehend. Vor Veröffentlichung aktive Worker-Versionen, Bindungen und öffentliche Website-Quelle geprüft. Die vorhandenen beiden App-Worker werden gemeinsam aktualisiert. Keine Datenbankmigration.
