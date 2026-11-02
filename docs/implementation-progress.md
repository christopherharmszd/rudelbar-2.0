# Rudelbar: genehmigter Umbau

Freigabe am 2. November 2026: „Plan einschließlich Tätigkeitsrahmen freigegeben.“
Arbeitszweig: codex/connected-backstage.

Maßgeblich ist rudelbar-freigabeplan-2026-11-02.txt im Ausgabeordner dieses Chats.
Der technische Detailplan bleibt dort ebenfalls erhalten.

| Abschnitt | Stand | Nachweis |
| --- | --- | --- |
| 1. Grundlage und Messdefinitionen | Erster Stand implementiert | Typisierte Beziehungen, Herkunft, Konflikte, Mengenprüfung und Messvertrag; eigene Speicherung pro Objekt/Beziehung. |
| 2. Bestehendes sicher umstellen | In Arbeit | 0008 auf echter Sicherung zweimal erfolgreich erprobt und remote angewendet; 3 Gäste, 5 Anfragen, 13 Nachrichten, 1 Push-Abo und 1 Konto unverändert. Versionierte D1-Freigabe und getrennte Durchführungen lokal integriert. |
| 3. Backstage und Vorbereitung | In Arbeit | Stand-Assistent und zentrale Aufgaben/Bestände/Beziehungen lokal geprüft. Mobile Navigation: 390 px ohne Seitenüberlauf, Team und Verwaltung über Mehr. Vorlagen, zentrale Standverweise, sichere Vorschau ohne Termin und CSV für Stammdaten/Beziehungen integriert. |
| 4. Auswertung | Offen | |
| 5. Gästegrundlage und Live | Offen | |
| 6. Memory Wall | Offen | |
| 7. Gewinnaktionen | Offen | |
| 8. Begegnungen und Dating | Offen | |
| 9. Gesamtabnahme und Gäste-UX | Offen | |

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
