# Rudelbar: genehmigter Umbau

Freigabe am 2. November 2026: „Plan einschließlich Tätigkeitsrahmen freigegeben.“
Arbeitszweig: codex/connected-backstage.

Maßgeblich ist rudelbar-freigabeplan-2026-11-02.txt im Ausgabeordner dieses Chats.
Der technische Detailplan bleibt dort ebenfalls erhalten.

| Abschnitt | Stand | Nachweis |
| --- | --- | --- |
| 1. Grundlage und Messdefinitionen | Erster Stand implementiert | Typisierte Beziehungen, Herkunft, Konflikte, Mengenprüfung und Messvertrag; eigene Speicherung pro Objekt/Beziehung. |
| 2. Bestehendes sicher umstellen | In Arbeit | 0008 auf echter Sicherung zweimal erfolgreich erprobt und remote angewendet; 3 Gäste, 5 Anfragen, 13 Nachrichten, 1 Push-Abo und 1 Konto unverändert. Vorlagen-/Laufzeitauflösung folgt. |
| 3. Backstage und Vorbereitung | In Arbeit | Stand-Assistent und zentrale Aufgaben/Bestände/Beziehungen lokal geprüft. Mobile Navigation: 390 px ohne Seitenüberlauf, Team und Verwaltung über Mehr. Vorlagen-/Kartenanbindung folgt. |
| 4. Auswertung | Offen | |
| 5. Gästegrundlage und Live | Offen | |
| 6. Memory Wall | Offen | |
| 7. Gewinnaktionen | Offen | |
| 8. Begegnungen und Dating | Offen | |
| 9. Gesamtabnahme und Gäste-UX | Offen | |

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
