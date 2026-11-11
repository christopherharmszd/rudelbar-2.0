# Aktuelle Fehleranalyse: zweiter Wall-Beitrag · 11. November 2026

Verlorener Gastzugang bei weiterhin geöffnetem Wall-Formular isoliert nachgestellt; Anmeldehinweis im iPhone-Screenshot bestätigt. Zwei Beiträge funktionieren mit gültiger Sitzung. Gezielte Korrektur mit rotem, fokussiertem Fehlerhinweis und expliziter Wiederanmeldung bei erhaltenem Foto-/Textentwurf lokal geprüft; 249 Tests und isolierter Gesamtabend erfolgreich. Zusätzlich ungültige Cookie-Ablaufzeit beim Lesen einer Wall-Mitteilung nachgewiesen und korrigiert. **Noch nicht veröffentlicht.** Die konkrete Ursache des ursprünglich verlorenen iPhone-Zugangs bleibt ungeklärt. Andere UX-, Live-Eingangs- und Textänderungen werden auf ausdrückliche Präzisierung zunächst nur gesammelt. [Befund und getrennte offene Aufgaben](wall-session-2026-11-11.md).

# Mobile Korrekturen · veröffentlicht am 11. November 2026

Die am 10. November gesicherte Arbeit wurde auf ausdrücklichen Auftrag wieder aufgenommen. Deckende App-Symbole und Teilen-Vorschau, dreistufige Mitteilungseinrichtung sowie die Fotoauswahl und Darstellung der Memory Wall sind umgesetzt. 243 Tests und der isolierte Gesamtabend sind erfolgreich. Gäste- und Team-Wizard sowie tatsächlicher JPEG-Upload, PNG-Vorschau und Entfernen mit erhaltenem Text wurden im Browser geprüft. Mobile Breite 390 px, keine Überbreite in den geprüften Ansichten. Der lokale Server wendet jetzt dieselben Sicherheits-Header wie die veröffentlichten Apps an.

Quelle `9a4eb55b4fa579f8302464e38b501d85746985c6` ist auf beiden Workern veröffentlicht. 23 tatsächlich ausgelieferte Dateien stimmen per SHA-256 mit der Quelle überein; Bindungen unverändert. Privater Testabend, neuer Wizard und Fotoformular wurden online geprüft. Echte iPhone-Kamera, Mediathek, Home-Bildschirm-Icon, Messenger-Cache und Push-Zustellung benötigen eine erneute Geräteprüfung. Neuer zweitseitiger PDF-Changelog V1.2 vom 11. November erstellt und gerendert geprüft; V1.1 bleibt erhalten. [Entscheidungen und Nachweise](mobile-fixes-2026-11-11.md); [historischer Pausepunkt](checkpoint-mobile-2026-11-10.md).

# App-Brand-Umstellung und interner Testabend · 10. November 2026

Gäste-App, Backstage, Live und ihre Vorschau verwenden gemeinsam Brand Guide V1.9: Night, Gold, Altweiß, Bitter und lokal ausgelieferte Source Sans 3. Fehler und Warnungen erhalten die ausdrücklich erlaubten Rot-/Orangetöne. [Umfang, Entscheidungen und App-Ausnahmen V1.1](app-brand-2026-11-10.md). Quelle `83a3527ae2f4bebc6b47a9ac9ee65a73331f0882` ist gesichert und auf beiden Workern veröffentlicht. 234 Tests, isolierter Gesamtabend und Online-Abgleich von 11 Assets erfolgreich. Anmeldung, Backstage, Gäste-Einstieg und Live wurden in der tatsächlichen Ausgabe geprüft. Die ältere Website-Freigabe und ihre noch offenen Aufgaben bleiben unabhängig davon bestehen.

Auf ausdrücklichen Auftrag wurde ein eigener privater Testabend für den 5. Dezember geöffnet: Wagen/Bar, Grill, DJ, Karaoke, Cornhole, Schnackbank und drei Pavillons mit Sitzbänken rund um die Bar. Sieben zentrale Stände, 14 Angebotszuordnungen und eine wiederverwendbare Vorlage; keine Verknüpfung mit einem öffentlichen Website-Termin. Der private Gäste-Link wird nur dem Inhaber übergeben. Testangaben sind kein bestätigter Aufbau-/Betriebsplan; echte Geräteabnahme bleibt offen.

# Unbedingt noch umzusetzen: getrennte Termintexte im Backstage

**Verbindliche offene Aufgabe, vom Inhaber am 8. November 2026 ausdrücklich priorisiert. Noch nicht umgesetzt.** Die Redaktion muss einen eigenen Kurztext für Startseite und Terminübersicht sowie die ausführliche Beschreibung für die Terminseite pflegen können. Das Kurztextfeld bleibt optional; seine Umsetzung ist verbindlich. Ohne Kurztext bleibt der erste Absatz der Beschreibung der Rückfall. Speichern und Veröffentlichen bleiben getrennt; vorhandene Termine benötigen keine Nachpflege. Backend-Validierung, erneutes Öffnen, Veröffentlichen und Leeren des Feldes sind vor dem Release zu prüfen. Umsetzungsschritte: [Termintexte im Backend](event-display-review-2026-11-08.md#unbedingt-noch-umzusetzen-kurztextpflege-im-backend).

## Separate Freigabevorschau · Entwurf 11 / Fragen, Suche und Footer

https://christopherharmszd.github.io/rudelbar-2.0/freigabe/ bietet Entwurf 11 sowie Vergleichsstände 02–10. Auf ausdrücklichen Wunsch vom 9. November steht „Fragen“ jetzt auf Desktop und mobil als letzter Hauptmenüpunkt. Dies ersetzt die frühere Desktop-Sechs-Punkte-Regel des Nachtrags 2. Die Suche filtert Fragen und Antworten, öffnet Treffer und stellt beim Leeren den vorherigen Zustand wieder her. Der Footer gruppiert dieselben Inhalte kompakter; Logo und Claim, direkte Kontaktwege, Fragen/Instagram sowie Rechtliches bleiben erhalten. [Prüfung und Umfang](review-11-2026-11-09.md).

Die übrige Gestaltung folgt 10, einschließlich Nachtrag-2-Wortlaut, großem Terminblock und Kartenclaim. Die positive Bewertung der Startseitengewichtung in Entwurf 06 bleibt zurückgezogen. Der Prototyp ist noch nicht nach app/ integriert. Produktion, Worker und CMS bleiben unverändert. Fragen liegen strukturiert vor; echte Backendpflege und der Datenschutzhinweis vom Team sind noch offen. Für die spätere FAQ-Pflege gilt ausdrücklich: gebräuchliche Suchbegriffe abdecken und jeden Eintrag mit typischen Gästesuchwörtern prüfen.

# Noch offen: Google Search Console

Ein dauerhaft verwaltetes Google-Konto einrichten, https://rudelbar.de/ bestätigen, https://rudelbar.de/sitemap.xml einreichen und tatsächliche Indexierung/Bilddarstellung prüfen. Erreichbarkeit allein ist kein Indexierungsnachweis.

# Noch offen: echte Geräteabnahme der Gäste-App

QR-Einstieg, Anmeldung, Angebote, Teilnahme, Postfach, Fotos und Benachrichtigungen auf tatsächlichen iPhones und Android-Geräten prüfen. Browsergrößenprüfungen ersetzen diese Abnahme nicht. Ein eigener privater Testabend für den 5. Dezember ist inzwischen geöffnet. Das ersetzt keine echte Geräteabnahme und öffnet nicht den öffentlichen Veranstaltungsabend.

## Freigegebener Darstellungsfix · 8. November 2026

Die freigegebenen Darstellungsänderungen an Terminen, Aktuelles und Abschlussfoto sind live. Staging und Produktion wurden erfolgreich gebaut und veröffentlicht; Produktionsmanifest, sieben öffentliche Seiten bzw. Einstiege sowie Desktop-/Mobilansichten wurden geprüft. Navigation, Seitenstruktur und Karte bleiben erhalten. Eine optionale Kurztext-Erweiterung für Termine ist separat geplant, im Backend noch nicht umgesetzt. Umfang, Nachweise und Rückfall für vorhandene Inhalte: [Termindarstellung und CMS-Plan](event-display-review-2026-11-08.md).

# Verbindlicher Betriebsstand · 8. November 2026

## Quelle und Veröffentlichung

- Bearbeitbare Quelle: `christopherharmszd/rudelbar-2.0`, `main`.
- Lokale Arbeitskopie: `/Users/christopher.harms/Documents/GitHub/rudelbar-2.0`.
- Produktionssteuerung: `christopherharmszd/rudelbar-pages`, lokal `/Users/christopher.harms/Documents/GitHub/rudelbar-pages`.
- Website-Produktionsquelle: `c5178a1b099fad1d7baee4013921d891925b1038`. Direkt mit dem Live-Manifest und den ausgelieferten Seiten/Dateien abgeglichen. Produktionssteuerung: `705ec03d775eee53444d4b251a6a3ed3f95a72ac`; erfolgreicher [Produktionslauf](https://github.com/christopherharmszd/rudelbar-pages/actions/runs/42507896701). Spätere reine Dokumentationscommits auf `main` ändern diese freigegebene Anwendungsquelle nicht. Vorherige Website-Quelle für einen gezielten Rückweg: `ab5395d1e0a1bd0190564f6e32a9ee7066c221a9`.
- Testwebsite: Quellcode-`main`, Dataset `staging`, `noindex`. Produktion: Dataset `production`. Keine automatische Inhaltskopie.
- Veröffentlichungs-Actions auf Node24-kompatiblen Versionen; Website-Bau weiterhin Node22. Vorhandene Zeitpläne unverändert. Kein direkter GitHub-Build-Aufruf oder Build-PAT mehr.

## Laufende Worker

| Dienst | Aktive Version | Geprüfte Quelle / Aufgabe |
| --- | --- | --- |
| `rudelbar-cms-staging` | `65daf458-d986-4f25-b411-ebfea6ac7d4c` | `9a4eb55b4fa579f8302464e38b501d85746985c6` · aktuelles Backstage/Backend |
| `rudelbar-app-staging` | `ef116ae3-5b35-499d-ae99-180ff9ff5635` | `9a4eb55b4fa579f8302464e38b501d85746985c6` · echte Gäste-App |
| `rudelbar-cms` | `31c09e26-84ac-4e41-b1a7-e2ae86616fd3` | `a241031bfc0e9c975e6f45ea09550520fa994a40` auf `fix/legacy-cms-audit-2026-11-05` · ausdrücklich beibehaltener Notfallzugang |
| `rudelbar-gtm-feedback` | `8c78a709-1f27-4618-962b-a2d2e5f8bfda` | eigenständige Feedback-Anwendung mit eigener D1-Datenbank; unverändert erhalten |

Die beiden App-Worker wurden am 11. November veröffentlicht; Versionen, Bindungen, ausgelieferte Dateien und Ansichten wurden geprüft. Die unabhängigen Dienste behalten den am 7. November geprüften Stand. `rudelbar-event-demo` wurde nach ausdrücklicher Auswahl entfernt. Der historische Namensbestandteil `staging` ist bei Backstage und Gäste-App kein Löschkriterium.

## Daten und Zugänge

Backstage: Website-Dataset `production`, internes Dataset `staging`, Projekt `uywmld5e`. D1 `rudelbar-live-staging` (`5207ce12-4fc5-4923-a92b-d30a8699b0ff`), private EU-R2-Ablage `rudelbar-guest-media`, WallFeed und vorhandene Zugangswerte bleiben erhalten. Gäste-App-Servicebindung `CONTENT` zeigt auf `rudelbar-cms-staging`.

Die vorhandenen Web3Forms-Formulare bleiben unverändert; beide E-Mail-Eingänge wurden vom Inhaber bestätigt. Kein Besucherzähler eingerichtet. Google kann frühere Bilder weiter im Cache haben; dunkles Organisationslogo und 192-Pixel-Favicon sind technisch veröffentlicht.

## Weiterarbeiten

Zuerst diese Datei und [den Veröffentlichungsablauf](production-release.md) lesen. [Backstage-Betrieb](../admin/README.md) und [Gäste-App betreuen](betrieb-gaeste-app.md) beschreiben die Nutzung. [Prüfungen vom 4. November](qa-2026-11-04.md) und die datierten Audit-/Wartungsberichte sind historische Nachweise, keine konkurrierenden aktuellen Betriebsanweisungen.

Geschützte SQL-Sicherungen, Zugangswerte und lokale Wiederherstellungspakete gehören nicht ins öffentliche Git. Keine Testdaten, Resets, Passwortänderungen, DNS- oder Mailänderungen im Rahmen der Bereinigung.
