# Rudelbar: verbindliche Quelle

Dieses Repository enthält den bearbeitbaren Quellcode für Website, Backstage und Gäste-App. Es gibt keinen zweiten Website-Snapshot mehr im Repository.

| Bereich | Quelle / Aufgabe |
| --- | --- |
| Öffentliche Website | `app/` |
| Backstage und Backend | `admin/` |
| Gäste-Oberfläche | `event-app/` |
| Gemeinsame Regeln | `shared/` |
| Betriebsstand und offene Aufgaben | [docs/CURRENT.md](docs/CURRENT.md) |

## Entwicklung und Veröffentlichung

- Entwicklung erfolgt auf `main` in diesem Repository. Die aktuelle lokale Arbeitskopie liegt unter `/Users/christopher.harms/Documents/GitHub/rudelbar-2.0`.
- Die Testwebsite unter https://christopherharmszd.github.io/rudelbar-2.0/ wird aus `main` mit Sanity `staging` gebaut und trägt `noindex`.
- https://rudelbar.de/ wird über [rudelbar-pages](https://github.com/christopherharmszd/rudelbar-pages) veröffentlicht. Dort steht ausschließlich die Veröffentlichungssteuerung; der Workflow baut einen ausdrücklich freigegebenen Commit aus diesem Quellcode-Repository.
- Ein Code-Release kopiert keine CMS-Inhalte. Öffentliche Inhalte liegen in Sanity `production`; interne App-Daten bleiben im historisch benannten Dataset `staging`.
- Der regelmäßige Website-Bau bleibt bestehen. Es gibt keinen GitHub-Build-Schlüssel in der Redaktion und keinen direkten Build-Aufruf beim Veröffentlichen. Neue statische Seiten, Sitemap und Vorschauinformationen entstehen mit dem nächsten erfolgreichen Bau.

Ablauf und Rückweg: [docs/production-release.md](docs/production-release.md).

## Aktive Dienste

- `rudelbar-cms-staging`: aktuelles Backstage und Backend; der historische Name ist keine ungenutzte Testumgebung. https://rudelbar.de/redaktion führt hierhin.
- `rudelbar-app-staging`: echte Gäste-App, verwendet das Backend über eine Servicebindung.
- `rudelbar-cms`: bewusst beibehaltener unabhängiger Notfallzugang. Sein eigener Quellcode liegt auf `fix/legacy-cms-audit-2026-11-05`, nicht auf modernem `main`.
- `rudelbar-gtm-feedback`: getrennte Feedback-Anwendung mit eigener Datenbank und eigenen Quellen; bleibt erhalten.
- Der frühere simulierte Prototyp `rudelbar-event-demo` wurde am 7. November 2026 entfernt.

## Lokal prüfen

Im Ordner `app/`: `npm ci`, `npm run build`, `npm test`; für Produktion zusätzlich `npm run build:production` und `npm run test:production`.

Im Ordner `admin/`: `npm ci`, `npm test`. Isolierte Bedienprüfungen stehen in `scripts/`. Die reguläre Worker-Konfiguration ist mit echten Beständen verbunden. Web3Forms-Testanfragen werden tatsächlich versendet.

[Redaktionsbetrieb](admin/README.md) · [Gäste-App betreuen](docs/betrieb-gaeste-app.md)

## Noch offen

Google Search Console einrichten und echte Indexierung/Bilddarstellung prüfen. Die Gäste-App benötigt weiterhin die abschließende Abnahme auf tatsächlichen iPhones und Android-Geräten. Einzelheiten in [CURRENT.md](docs/CURRENT.md).
