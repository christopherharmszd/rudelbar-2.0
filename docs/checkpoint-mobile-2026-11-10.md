# Pause: mobile Korrekturen

Stand 10. November 2026. Der Inhaber hat ausdrücklich „speichern und Feierabend“ angeordnet. Keine weitere Entwicklung oder Veröffentlichung bis zur Wiederaufnahme.

## Gesicherter Stand

Arbeitsbranch `work/mobile-fixes-2026-11-10`, Basis `979a2d6625728b9c4da04c221cd21eda83ea82f7`. Keine App-, Website- oder Datenveröffentlichung in diesem Korrekturlauf. Die laufenden Worker bleiben Backstage `24bab839-2457-41cb-ac9f-58e75e8c8651` und Gäste-App `b207c53b-e54c-4851-9734-212d48d191ae`. Keine Gäste-Inhalte, Konten, Zustimmungen oder Zugangscodes verändert.

## Aufträge und vorbereitete Änderungen

1. **Home-Bildschirm und Teilen:** Das Original-Logo bleibt unverändert. Deckende App-Symbole (180, 192, 512 px und maskierbare Variante) sowie ein 1200×630-Vorschaubild auf Night-Schwarz liegen in `shared/brand/images/`. Reproduzierbar mit `scripts/prepare-app-icons.mjs` und den vorhandenen Sharp-Abhängigkeiten aus `app/`. HTML-Einstiege, Apple-Touch-Verweise sowie Gäste- und Live-Manifeste verwenden die neuen Dateien. Generierte Kopien werden über die vorhandene Brand-Vorbereitung verteilt. Metadaten enthalten keine privaten Veranstaltungsangaben; private Start-Links behalten ihren Zugangscode.
2. **Mitteilungen einrichten:** Drei geführte Schritte: Hinweiston mit Testton, freiwillige Hintergrundmitteilungen, Übersicht/Abschluss. Die iPhone-/iPad-Anleitung erscheint nur auf iOS außerhalb einer installierten Web-App. Android und Desktop erhalten die passende direkte Möglichkeit. Das Postfach und seine ungelesenen Nachrichten bleiben von der Einrichtung getrennt. Gäste und Team verwenden dieselbe Quelle. Bestehende Ton-Einstellung und Push-Anmeldung bleiben erhalten.
3. **Memory Wall auf dem iPhone:** Zwei echte Buttons trennen Kamera und Bildauswahl; nur der Kamera-Eingang hat `capture`. Die fehlende lokale Vorschau hat eine konkrete Ursache: `event-app/public/_headers` erlaubte keine `blob:`-Bilder. Nur diese Bildquelle wurde ergänzt; Script- und Netzwerkfreigaben bleiben unverändert. Vorschau-JPEGs werden vor dem Upload von optionalen Metadaten bereinigt. Änderungen des Fotos erhalten eine neue Versandkennung. Lauftext, Checkboxen, Links, Fotovorschau und Buttonzustände wurden angepasst; Hover-Effekte gelten nur auf Geräten mit Hover-Unterstützung.

## Prüfungen und Grenzen

243 automatisierte Tests erfolgreich, darunter fünf neue Prüfungen für plattformabhängige Einrichtung, blockierte Push-Erlaubnis, unveränderten privaten Manifest-Startlink, deckende Symbole und die begrenzte Bildquellenfreigabe. `git diff --check` erfolgreich. Das ist ein Entwicklungscheckpoint, keine visuelle oder mobile Abnahme.

Noch erforderlich vor einer Veröffentlichung:

- Quellcode-Diff prüfen, Bilddateien visuell auf schwarzem Hintergrund kontrollieren und neue Metadaten/Manifest-Verweise abgleichen.
- Isolierten Server starten und Gäste- sowie Team-Einrichtung durchspielen: Ton an/aus und Test, ohne Push weiter, mit Push weiter, blockierte/nicht verfügbare Mitteilungen, erneutes Öffnen; iOS-Browser und installierte iOS-App separat berücksichtigen. Es darf keine Erlaubnisabfrage ohne den bewussten Aktivierungsbutton erfolgen.
- Wall-Bildauswahl, Vorschau, Entfernen, Ersetzen, Entwurfserhalt und tatsächlichen lokalen Foto-Upload prüfen. Keine fremden echten Fotos veröffentlichen. Originale und Zustimmungen bleiben geschützt. Native iPhone-Kamera und Mediathek benötigen eine tatsächliche Geräteprüfung.
- Dialoge bei mobilen Breiten und mit Tastatur prüfen; konsistente Buttons, Checkboxgrößen, Linkfarben und Scrollen kontrollieren. Die beigefügten Screenshots zeigen den ursprünglichen Fehler, nicht die neue Umsetzung.
- Cache-Versionen/Imports der geänderten Browserdateien vor dem Release prüfen; die vorbereiteten Bilddateien haben bereits neue versionierte Namen.
- Nach vollständiger Prüfung den Arbeitsstand nach `main` übernehmen, sichern und beide bestehenden App-Worker veröffentlichen. Aktive Branch-Spitzen, Bindungen und Website-Manifest vorher prüfen. Öffentliche Website und Notfallredaktion unverändert lassen.
- Live-Dateihashes, Original-Logo, Startlinks und tatsächliche Ausgabe prüfen. Bereits gespeicherte iOS-Icons bzw. Messenger-Vorschauen können einen eigenen Cache haben; ohne Geräteprüfung keine automatische Aktualisierung behaupten.
- Changelog bei Abschluss fortschreiben; vorhandene PDF V1.1 nicht überschreiben. Dieser Checkpoint ist noch kein neuer veröffentlichter Changelog-Stand.

## Praktische Wiederaufnahme

Kanonisches Repository: `/Users/christopher.harms/Documents/GitHub/rudelbar-2.0`. Node: `/Users/christopher.harms/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`. Vorbereitung: `node event-app/prepare.mjs`. Tests: `node --test admin/tests/*.test.mjs event-app/tests/*.test.mjs`. Isolierte Prüfung: `scripts/isolated-wall-preview.mjs` und `scripts/isolated-guest-experience-check.mjs`; nur flüchtige Testdaten verwenden. Die lokale Prüfinstanz aus dem vorherigen Release wurde beendet.

Der direkte HTTPS-Git-Push hatte keine Anmeldung. Die vorhandene GitHub-Anbindung kann den geprüften Quellbaum sichern. Lokalen und entfernten Quellbaum vor einem Referenzabgleich exakt vergleichen; keine Arbeitsdateien zurücksetzen. Cloudflare-Anmeldung war außerhalb der Sandbox verfügbar. Geschützte `.qa/`-Dateien und Zugangswerte gehören nicht ins öffentliche Git.
