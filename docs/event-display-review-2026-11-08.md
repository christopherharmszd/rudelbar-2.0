# Prüfvorschau: Termindarstellung · 8. November 2026

Status: lokale Prüfvorschau vom Inhaber freigegeben und am 8. November 2026 als Website-Fix veröffentlicht. Navigation, Seitenreihenfolge, Karte und vorhandene redaktionelle Texte bleiben bestehen. Kein GTM-Umbau. Die unten vorgeschlagene Backend-Erweiterung bleibt geplant.

## Darstellung

- Startseite und Terminübersicht: kompakte Ankündigung, Titel, einmal Datum/Uhrzeit und einmal Treffpunkt/Adresse. Vollständige Beschreibung über „Alle Informationen“.
- Detailseite: ein Titel statt doppelter Überschrift; Daten und Route direkt darunter; vollständige Beschreibung mit Absätzen und Zeilenumbrüchen.
- Kleinere Bildschirme: Titel, Fakten und Aktionen untereinander; kein horizontaler Überlauf.
- Aktuelles: ein oder zwei Beiträge nutzen die verfügbare Breite; ohne veröffentlichte Beiträge bleibt der Bereich ausgeblendet.
- Startseite: Abstand zwischen Abschlussfoto und Footer sowie lesbare Bildbeschriftung.

## Unbedingt noch umzusetzen: Kurztextpflege im Backend

Diese Backend-Erweiterung ist **verbindlich noch umzusetzen und noch nicht implementiert**. Der Inhaber hat sie am 8. November 2026 ausdrücklich als unbedingt offen markiert. Das Kurztextfeld selbst bleibt optional; die Erweiterung ist keine bloße Option mehr. Kein Worker-Deployment und keine Sanity-Migration gehörten zum veröffentlichten Darstellungsfix.

| Feld | Pflege | Öffentliche Verwendung |
| --- | --- | --- |
| `title` | bestehender Titel | Vorschau und Detailüberschrift |
| `teaser` | neuer optionaler „Kurztext für Startseite und Terminübersicht“, maximal 300 Zeichen | kompakte Ankündigung |
| `description` | bestehende Beschreibung, künftig als „Ausführliche Beschreibung“ bezeichnet | vollständige Terminseite mit Absätzen und Zeilenumbrüchen |

Ist der Kurztext leer, nutzt die Vorschau den ersten Absatz der Beschreibung. Er wird bei über 240 Zeichen an einer Wortgrenze mit Auslassungszeichen gekürzt. Die Detailseite zeigt immer die vollständige Beschreibung. Bestehende Termine benötigen keine Nachpflege. Ein gesonderter Vorschautitel ist zunächst nicht vorgesehen.

Die Website berücksichtigt das optionale Feld bereits; aktuelle Termine ohne Feld verwenden den beschriebenen Rückfall. Ein eigener Kurztext wurde nicht in echten Inhalten angelegt.

### Gezielte spätere Backend-Arbeit

1. `admin/public/website-editor.js`: optionales Textfeld bei Terminen ergänzen, 300-Zeichen-Limit und verständlicher Hinweis auf den Rückfall. Bestehende Beschreibung umbenennen; Speichern und Veröffentlichen bleiben getrennt.
2. `admin/worker.mjs`, `fields("events", data)`: `teaser: clean(data.teaser, 300)` zulassen. Aktuell entfernt die Feld-Auswahl zusätzliche Eingaben, deshalb genügt allein ein Formularfeld nicht.
3. `admin/lib/sanity.mjs`: Draft-/Publish-Ablauf mit neuem Feld prüfen. Publizieren kopiert die freigegebenen Draft-Felder; keine neue Datenstruktur und keine Inhaltsmigration erforderlich. Sicherstellen, dass explizites Leeren den gespeicherten Kurztext entfernt bzw. als leeren Wert speichert.
4. Isoliert prüfen: Alttermin ohne Kurztext; Kurztext speichern und erneut öffnen; Entwurf verändert veröffentlichte Anzeige noch nicht; Veröffentlichen übernimmt ihn; Leeren aktiviert Rückfall; Archivieren/Wiederherstellen behalten beide Texte; Überlänge wird abgewiesen.
5. Erst nach Prüfung und Freigabe Backend und Website gezielt veröffentlichen. Keine Änderung an Anmeldungen, Rollen, Datasets, Domains oder Veröffentlichungs-Zeitplänen.

## Prüfgrenzen

Die lokale Vorschau verwendet einen lesend gebauten Stand der veröffentlichten Produktionsinhalte. Ihre Formularsendungen und CMS-Weiterleitungen sind ausschließlich im lokalen Vorschauserver gesperrt. Diese Vorschausperren gehören nicht zur Website-Änderung. Die GTM-Entwurfsvorschau bleibt separat bestehen.

Browserprüfungen bei schmaler und breiter Fenstergröße ersetzen keine Abnahme auf echten iPhones und Android-Geräten. Bestehende Ortsnamensabweichungen in redaktionellen Inhalten werden nicht stillschweigend korrigiert.

## Lokal geprüft

- Ausgangsquelle: `067f84105f0db8d7ce8ca8fdbd6aa4164e08b892`, vor Beginn identisch mit entferntem `main`. Website-Code gegen Live-Quelle `ab5395d1e0a1bd0190564f6e32a9ee7066c221a9` abgeglichen, ohne Abweichung in `app/`.
- Staging- und Produktions-Build erfolgreich; jeweils 15 Prüfungen bestanden. Zusätzliche Regression prüft eindeutige Terminüberschrift, vollständige Absätze, einzelne Datumsanzeige und optionalen Kurztext mit Rückfall.
- Browser: Startseite, Terminübersicht, Termindetail und Aktuelles in ausgewählten Breiten von 320, 390, 768 und 1440 Pixeln geprüft. Kein horizontaler Überlauf in diesen Ansichten. Drei vorhandene Beschreibungsabsätze bleiben erhalten; Route auf dem 390-Pixel-Format im ersten Bildschirm erreichbar.
- Lokale Schutzmaßnahmen: HTTP-`noindex`, Snapshot statt erneuter Sanity-Abfrage, keine nicht-lesenden Serveranfragen. Formular mit lokalen Testwerten bedient: bestätigt „Es wird keine Nachricht verschickt“. Keine echten E-Mails gesendet.
- Vorschau: `http://127.0.0.1:4398/`; Erläuterungen unter `/__review/`. Screenshots und lokaler Vorschauserver liegen im Arbeitsordner `work/rudelbar-display-review-2026-11-08` der zugehörigen Codex-Session. Website-Code verbleibt ausschließlich in der kanonischen Arbeitskopie.
- Zum Abschluss der Prüfvorschau war kein Commit, Push, Worker-Deployment oder Produktionsrelease vorgenommen. Die spätere Freigabe umfasst den Website-Fix; die Backend-Erweiterung bleibt geplant.

## Produktionsveröffentlichung · 8. November 2026

- Freigegebene Website-Quelle: `c5178a1b099fad1d7baee4013921d891925b1038` in `christopherharmszd/rudelbar-2.0/main`. Produktionssteuerung: `705ec03d775eee53444d4b251a6a3ed3f95a72ac` in `rudelbar-pages/main`.
- [Staging-Bau und Deployment](https://github.com/christopherharmszd/rudelbar-2.0/actions/runs/42507797714) erfolgreich; [Produktionsbau und Deployment](https://github.com/christopherharmszd/rudelbar-pages/actions/runs/42507896701) erfolgreich. Beide Abläufe bauen und testen den jeweiligen Zielstand.
- `https://rudelbar.de/site-manifest.json` bestätigt diese Quelle und Dataset `production`. Startseite, Terminübersicht, Termin-Detail, Aktuelles, Datenschutz, Impressum und Redaktionseinstieg liefern HTTP 200. Öffentliche Seiten bleiben indexierbar; Redaktionseinstieg bleibt `noindex, nofollow` und verweist auf das aktuelle Backstage.
- Die ausgelieferte Terminseite hat eine H1, einen Datumsblock und drei getrennte Beschreibungsabsätze. Neue CSS-/JavaScript-Dateien sind erreichbar. Kein lokaler Vorschauhinweis oder gesperrter Vorschauversand wurde mitveröffentlicht; Web3Forms bleibt unverändert.
- Live-Browserkontrolle: Termindetail auf Desktop und bei 390 Pixeln ohne horizontalen Überlauf; Startseite mit einer kompakten Ankündigung, einem News-Beitrag in voller mobiler Breite, geladenem Abschlussfoto, heller Beschriftung und Abstand zum Footer. Keine Browserfehler bei dieser Prüfung. Das ist weiterhin keine echte iPhone-/Android-Abnahme.
- Keine Worker-, Datenbank-, CMS-Inhalts-, Zugangs-, DNS- oder Mailänderungen. Rückweg: vorherige Website-Quelle `ab5395d1e0a1bd0190564f6e32a9ee7066c221a9` gezielt wieder im Produktionsworkflow setzen.
