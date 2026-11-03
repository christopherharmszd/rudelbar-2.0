# Rudelbar: genehmigter Umbau

Freigabe am 2. November 2026: „Plan einschließlich Tätigkeitsrahmen freigegeben.“
Arbeitszweig: codex/connected-backstage.

Maßgeblich ist rudelbar-freigabeplan-2026-11-02.txt im Ausgabeordner dieses Chats.
Der technische Detailplan bleibt dort ebenfalls erhalten.

| Abschnitt | Stand | Nachweis |
| --- | --- | --- |
| 1. Grundlage und Messdefinitionen | Online | Eigenständige Objekte und Beziehungen, Herkunft, Konflikte und Mengenprüfung. |
| 2. Bestehendes sicher umstellen | Kern online | 0008–0010 erhalten Konten, Gäste, Anfragen und Sitzungen. Versionierte Freigaben besitzen einen atomaren Aktivierungspunkt. |
| 3. Backstage und Vorbereitung | Kern online | Vorlagen ohne Termin, zentrale Stände/Ortspläne, Zuordnungsassistent, CSV und mobile Navigation. Weitere Modulkonfiguration folgt mit den Modulen. |
| 4. Auswertung | Online | Fachaktionen, freiwillige Bedienmessung, Abdeckung, CSV, feste Rudelbar-Anbieterquellen; zusätzliche Messung bleibt aus. |
| 5. Gästegrundlage und Live | Kern online | Editierbare eigene Profile, echte Rundengespräche, Sperren, Meldungen, Schutz-Team und getrennte Push-Cursor geprüft. |
| 6. Memory Wall | In Arbeit, separat gesichert | Private Medien, Moderation, Leinwand, Archiv und Wiederherstellung lokal geprüft; noch nicht veröffentlicht. |
| 7. Gewinnaktionen | Kern in Arbeit, nicht online | Vier Formate, Bestände und sichere Ausgabe. |
| 8. Begegnungen und Dating | Offen | Freiwillige Begegnungen, Tanz, Dating und gegenseitige Kontakte. |
| 9. Gesamtabnahme und Gäste-UX | Offen | Gesamtprüfung und abschließende Gästeoberflächen. |

## Veröffentlichter Grundlagenstand

Worker: 32b5fc0b-4c79-4590-9e3c-9f32d38b60b4.
GitHub: e87b64880bd7a7286d3643a62aba97efaeaf7c08 auf codex/connected-backstage.
Dieser Quellbaum ist inhaltsgleich mit lokalem Commit 1f01614 (gleicher Git-Baum
fca02daf89648a34e5daf1980d5f4877dcc47f34). Die lokale Originalhistorie bleibt unter
codex/connected-backstage-local-1f01614 erhalten. Der aktive Zweig folgt GitHub.

15 Online-Prüfungen bestätigen Dateiinhalte, geschützte APIs und erhaltene
Anmeldung/Mailkonfiguration. Alle 30 Produktions- und 42 App-Dokumente behalten
ihre Revision. Die ersten 113 Tests bestanden zum Veröffentlichungszeitpunkt.
Die Online-Browsersitzung ist abgelaufen; die authentifizierten Bedienprüfungen
erfolgten im isolierten lokalen System, nicht mit erfundenen Arbeitsdaten.

## Nachfolgender Ausbau, noch nicht veröffentlicht

Referenzierte Vorlagen, Standreferenzen auf Ortsplänen, getrennte Runtime-IDs je
Durchführung und explizite öffentliche Kontaktanzeige sind lokal implementiert.
129 automatisierte Tests bestehen. Eine isolierte HTTP-Prüfung bestätigt zwölf
zusammenhängende Fälle von Vorlage bis Rundenteilnahme, erneuter Freigabe und
Schließen bei weiterhin lesbarem eigenem Postfach. Prüfbelege liegen im
Ausgabeordner connected-backstage-qa dieses Chats.

Als Nächstes: verbindliche versionierte Laufzeitfreigabe mit einem atomaren
Aktivierungspunkt, Sicherung noch offener Anfragen/Runden beim Konfigurationswechsel,
abschließende Browserprüfung der Stand-/Vorlagenanbindung sowie CSV für die neuen
Stammdaten/Beziehungen. Danach folgt der eigene Auswertungsbereich.

Redaktion-Zugang, Notfallredaktion, Website-Produktionsquelle und bestehende
Konten/Anfragen/Runden/Push-Abos bleiben erhalten. Keine zusätzlichen Tracking-Cookies.
Neue Module werden nicht automatisch für echte Gäste geöffnet.

Die Datenbanksicherung wurde tatsächlich lokal wiederhergestellt und ihre
Integrität geprüft. Die additive Identitätsumstellung erzeugt je altem Gast
ein eigenes Profil; keine Zusammenführung nach Namen und keine automatische
Zustimmung. Die Kompatibilitätstrigger halten alte Schreibwege konsistent.
Sobald kanonische Sitzungen aktiviert sind, ist diese kompatible Codefassung
die Rückkehrbasis; eine alte Fassung ohne Prüfung von Widerrufen darf nicht
erneut als Authentifizierungsweg aktiviert werden.

Prüfung des nächsten Veröffentlichungsstands: 0009 auf der frischen Sicherung vom
2. November zweimal angewendet; bestehende Besucher, Sitzungen, Anfragen, Nachrichten,
Push-Abos und Konten bytegleich erhalten. Freigaben verwenden einen atomaren D1-Verweis.
Sanity erhält wiederholbare Quittungen; ein Quittungsausfall setzt die Freigabe nicht zurück.
Offene Anfragen und laufende Runden werden vor entfernten Zuordnungen geschützt.
CSV-Rundreise prüft Leerwertabweichungen, Zeilenumbrüche, Formeltexte und Beziehungen.
Browsernachweis: verbundener Ortsplan und Auswahl vorhandener zentraler Stände.

## Verknüpfte Vorlagen und Laufzeit online

GitHub b337deedc38e9f33773f680c740bf1c71fcc1189; Worker
0b618cce-8fb6-4e3b-b07c-44533e996d28. 20 Online-Prüfungen bestanden.
0009 ist remote angewendet. Alle Bestände bleiben erhalten (3 Gäste, 5 Anfragen,
13 Nachrichten, 1 Push-Abo, 1 Konto, 3 kanonische Sitzungen). Keine echten
Freigabepakete oder Beispielvorlagen angelegt.

## Auswertung, nächster geprüfter Stand

Eigener Bereich mit Überblick, Beteiligung, Kommunikation, freiwillig gemessenen
Inhalten/Wegen, Betrieb und Einrichtung. Datenstand, Berlin-Zeitfilter, Vergleiche,
CSV, Quellen und Abdeckung sind sichtbar. Keine erfundene Vergangenheit oder
Gästezahlen aus Hintergrundabrufen. Fachaktionen werden mit ihren Schreibvorgängen
erfasst; Bedienereignisse benötigen eine aktuelle getrennte Zustimmung. Widerruf
entfernt noch vorhandene einzelne Bedienereignisse. Keine zusätzlichen Tracking-Cookies.

142 Tests bestanden; zusätzlich echter Cloudflare-D1-Laufzeittest. Isolierte
HTTP-Prüfungen bestätigen 13 Fälle der Vorlagen-/Freigabelogik sowie 9 Fälle für
Zustimmung, wiederholte Übertragung, QR-Platzierung, bestätigten Abschluss, CSV,
Widerruf und tatsächlich gesperrte alte Gastsitzung nach Abmeldung. Die Push-Prüfung
verhindert Zustellung selbst bei einer erneut aktivierten veralteten Subscription.

0010 wurde auf der frischen Betriebssicherung zweimal verlustfrei erprobt.
Zusätzliche Messung und Anbieterabruf bleiben standardmäßig aus. Vor Aktivierung
werden Zweck, Grundlage, Datenschutzinformation und Fassung in Backstage gepflegt.
Fachliche Bestandsauswertungen sind davon getrennt verfügbar.

Die Cloudflare-Abfragen wurden am echten Konto lesend geprüft (Worker-Aufrufe,
Fehler, Unteranfragen; D1-Lese-/Schreibabfragen, Zeilen und P90-Laufzeit). Dafür
wurde ausschließlich der bestehende Desktop-Zugang im Lesetest benutzt. Er wird
nicht an das laufende Produkt übertragen. Der dauerhafte Anbieterabruf benötigt
einen separaten Schlüssel mit Account Analytics Read, im Backend verschlüsselt.

Quellen der geprüften Anbieterfelder:
https://developers.cloudflare.com/d1/observability/metrics-analytics/
https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/
https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/

Weiter offen: gemeinsame Kontextgespräche und erweiterte Gastprofile, Wall,
Gewinnaktionen, Dating/Tanz/Kontakte, abschließende Gesamt- und Geräteprüfung.
Die allgemeinen Gästeoberflächen bleiben bis zum letzten Abschnitt nachrangig.

## Anbieterzugang und korrigierte Statusanzeige

Der Nutzer hat den separaten Analytics-Lesezugang im echten Backstage eingerichtet.
Remote geprüft: enabled=1, letzter Abruf ok, sechs gespeicherte Tagesstände,
ausschließlich die zwei Rudelbar-Worker und die Rudelbar-D1-Datenbank. Kein
Schlüsselinhalt wurde gelesen oder ausgegeben.

Korrektur: Die Anzeige verwechselte einen Zeitraum ohne Anbieterwerte mit einer
fehlenden Verbindung. Der Verbindungsstatus kommt nun unabhängig vom Zeitraum
aus der Anbindung. Aktuelle Betriebswerte (gestern/heute UTC) und der Zeitraum der
Abendauswahl sind getrennt wählbar. CSV benennt den jeweiligen Anbieterzeitraum.
Die Anzeige lädt nach erfolgreichem Verbinden sofort neu. Ein eigener Regressionstest
prüft den verbundenen Zustand bei einem alten Abend ohne passende Anbieterwerte.
143 Tests sowie der Cloudflare-D1-Laufzeittest bestehen.

## Gästegrundlage und Live, geprüfter nächster Stand

Gastprofil mit gleichbleibender Identität und CAS-Speicherung. Angaben bleiben
abendbezogen; Kurzbeschreibung und Interessen werden nicht automatisch öffentlich.
Rundengespräche benötigen aktuelle tatsächliche Mitgliedschaft. Sequenzgrenzen
verhindern das Lesen von Nachrichten vor dem Beitritt, auch innerhalb derselben
Millisekunde. Beim Verlassen endet der normale Zugriff. Eigene Meldungen aus dem
Teilnahmezeitraum bleiben möglich. Gegenseitige Profilsperren wirken beim Lesen,
Senden, Postfach, Beitreten und unmittelbar vor Push-Versand.

Nur Administration oder explizit zugewiesenes Schutz-Team sehen gemeldete Ausschnitte.
Stationsbetreuung erhält keinen Zugriff auf private Rundengespräche. Der vorhandene
Gerätezugang bleibt erhalten; Gesprächsversand besitzt einen separaten Cursor und
vermischt keine bestehenden Stationszustellungen. Neue Gespräche bleiben pro Vorlage
standardmäßig aus. Die Freigabe benötigt eine Datenschutzinformation; Nachrichten
werden nach konfigurierten 1–30 Tagen gelöscht, Meldungen nach 30 Tagen.

0011 wurde auf einer frischen tatsächlichen Betriebssicherung zweimal erprobt:
43 vorhandene Tabellen unverändert, Integrität und Fremdschlüssel korrekt.
Isolierte HTTP-Prüfung bestätigt sechs neue Gesamtfälle; Browser bestätigt
Profiländerung, Beitritt und Nachricht bei 390 px ohne Seitenüberlauf. Der echte
Cloudflare-D1-Laufzeittest besteht ebenfalls.

Zusätzlich behoben: Nach erneuter Anmeldung desselben Kontos in einem anderen Tab
wurde ein offenes Formular wegen veralteter CSRF-Prüfung abgelehnt. Der Client erneuert
nur nach einer eindeutig vor dem Schreiben abgelehnten Sicherheitsprüfung den
Sitzungsnachweis. Kontoidentität muss gleich bleiben. Herkunftsfehler, Rechtefehler,
Netzausfälle und unklar ausgeführte Schreibvorgänge werden nicht automatisch wiederholt.
Bestehende Formulareingaben bleiben dabei erhalten.

## Gesicherter Arbeitsstand am 3. November 2026

Abschnitt 5 ist auf GitHub und beiden bestehenden Workern veröffentlicht:
Quelle 772ae1c90b083127a5dc9e31d45b891b6bf9c73a; Backend
b6cdd2c5-cdda-4038-b488-fc2902bf4b90; Gäste-App
0087329d-b1c2-47c5-b410-9bed0e3e9df2. 0011 ist remote angewendet.
20 Online-Prüfungen bestätigen Dateien, geschützte APIs und erhaltene Anmeldung/Mail.

Der weitere Wall-Ausbau wird auf einem separaten Sicherungszweig erhalten.
Die eigene private EU-R2-Ablage rudelbar-guest-media wurde angelegt. 0012,
WallFeed-Namespace und zugehörige Worker-Bindings sind noch nicht veröffentlicht.
161 automatisierte Tests bestehen; zusätzlich der Test mit echten lokalen
Cloudflare-Workern, RPC, D1, R2 und ruhenden WebSockets. Im Browser wurden
Fotoauswahl/Vorschauerstellung, Einreichung ohne externe Freigabe, Moderation,
Spotlight, ZIP-Export und geschützte Wiederherstellung tatsächlich durchgeführt.
Die Spotlight-Leinwand passt ohne Überlauf in 1280 × 720 Pixel.

Reproduzierbare isolierte Prüfumgebung: scripts/isolated-wall-preview.mjs und
scripts/isolated-wall-check.mjs. Sie haben keine produktiven Zugangsdaten und
keine Verbindung zu echten Arbeitsbeständen. SQL-Sicherungen und operative
Zugangsdaten bleiben außerhalb des öffentlichen Repositorys.

Detaillierte Fortsetzung und noch offene Punkte: docs/resume-2026-11-03.md.
Der gesamte Neun-Abschnitte-Plan ist weiterhin nicht abgeschlossen.

## Wall-Härtung, weiterhin separat und nicht veröffentlicht

165 Tests bestehen. Freigaberücknahme funktioniert trotz geänderter Information,
alter Revision oder geschlossenem Abend. HMAC schützt Archivherkunft und Fristen.
Geschützte Archivgalerie, gemeinsame Wall-Mitteilungen ohne neue Geräteerlaubnis,
separater Versandcursor, Wall-Auswertung und begrenzte Ablaufbereinigung ergänzt.
0012 auf wiederhergestellter Betriebssicherung zweimal geprüft; vorhandene Tabellen
unverändert. Vier isolierte 1/5/25/100-Sammlungen aufgebaut; visuelle Abnahme noch
offen, weil Browserwerkzeug lange blockierte. Laufender Betrieb nicht verändert.

## Gewinnaktionen: geprüfter Kern, noch keine vollständige Bedienkette

177 Tests bestehen. Vier Formate, begrenzter Preisvorrat, eingefrorener Pool,
gleichverteilte serverseitige Auswahl, genaue Wiederholung und konkurrierende
Ausgabe sind implementiert. Physische Rechte sind gegen alle möglichen Ausgänge
abgesichert; Neuziehung vergrößert keinen Budgetplatz. Persönlicher HMAC-Nachweis
schützt die Ausgabe unabhängig von öffentlicher Gewinneranzeige. Einrichtung,
Live-/Gastoberflächen, Mitteilungen, Laufzeittest und Veröffentlichung noch offen.
