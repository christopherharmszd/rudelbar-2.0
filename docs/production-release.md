# Rudelbar veröffentlichen

## Eine bearbeitbare Quelle, getrennte Ziele

`christopherharmszd/rudelbar-2.0` enthält den Quellcode. `main` baut die Testwebsite. Das Repository `christopherharmszd/rudelbar-pages` enthält die Steuerung für https://rudelbar.de/ und baut einen fest freigegebenen Quellcode-Commit. Alte fertige Website-Dateien werden dort nicht mehr von Hand gepflegt.

| Bereich | Aktuelles Ziel |
| --- | --- |
| Testwebsite | https://christopherharmszd.github.io/rudelbar-2.0/ · Sanity `staging` · `noindex` |
| Öffentliche Website | https://rudelbar.de/ · Sanity `production` |
| Backstage | https://rudelbar-cms-staging.christopher-harms.workers.dev/backstage#website |
| Unabhängiger Notfallzugang | https://rudelbar-cms.christopher-harms.workers.dev/ |
| Gäste-App | https://rudelbar-app-staging.christopher-harms.workers.dev/ |

Der historisch benannte Backstage-Worker bearbeitet Website-Inhalte in `production`, interne App-Inhalte in `staging`. Ein Code-Release überträgt keine Inhalte zwischen Datasets. Die beiden CMS-Zugänge bleiben auf ausdrücklichen Wunsch erhalten.

## Separate öffentliche Freigabevorschau

Entwurf 07 unter https://christopherharmszd.github.io/rudelbar-2.0/freigabe/ enthält die Korrektur mit Einstieg und großem Terminblock aus 04 sowie den gewünschten Kürzungen und kompakten Buttons. Die pauschale positive Startseitenbewertung von 06 ist zurückgezogen. Versionen 02–07 sind über die Vergleichsleiste und feste Links erreichbar. Historische Inhalte und gemeinsame Assets sind per SHA-256 gesperrt. [Quelle und Grenzen](../previews/brand-2026-11-08/README.md).

Die Kopie nach app/dist/client/freigabe erfolgt ausschließlich im Staging-Workflow. Der Produktions-Build übernimmt diese Dateien nicht. Eine Designfreigabe ist keine Produktionsfreigabe; die Integration nach app/ und die offenen Backend-/CMS-Aufgaben bleiben separate Schritte. Nach der Vorschauveröffentlichung folgt eine neue UX-Prüfung des tatsächlichen Stands.

## Vor jedem Release

1. Aktuelle entfernte Branch-Spitzen und tatsächlich laufende Quellen prüfen. Lokaler Ordnername und ein alter `origin/main`-Verweis sind kein Aktualitätsnachweis.
2. Für die Website `app/` aus dem vorgesehenen Commit bauen und beide Ziele prüfen: `npm ci`, `npm run build`, `npm test`, `npm run build:production`, `npm run test:production`.
3. Testwebsite, mobile Darstellung, Navigation und betroffene Funktionen prüfen. Formulare senden echte E-Mails. Inhalte nicht durch Testbeiträge überschreiben.
4. Für die öffentliche Website ausschließlich den freigegebenen vollständigen SHA in `rudelbar-pages/.github/workflows/production.yml` ändern: sowohl `with.ref` als auch `RUDELBAR_SOURCE_SHA`. Keine fertigen Dateien in den Repository-Stamm kopieren.
5. Nach ausdrücklichem Produktionsauftrag diese Änderung übernehmen, erfolgreichen Bau und Deployment abwarten und `https://rudelbar.de/site-manifest.json` sowie echte Seiten und Dateien prüfen.

Die momentan freigegebene Website-Quelle ist `c5178a1b099fad1d7baee4013921d891925b1038` (Darstellungsfix vom 8. November 2026). Produktionssteuerung: `705ec03d775eee53444d4b251a6a3ed3f95a72ac`. Bau, Tests, Deployment und tatsächliche Ausgabe sind bestätigt. Vorherige Website-Quelle für den Rückweg: `ab5395d1e0a1bd0190564f6e32a9ee7066c221a9`. Worker wurden für diesen Website-Fix nicht veröffentlicht; die optionale Termin-Kurztextpflege im Backend bleibt geplant.

## Worker getrennt warten

`admin/wrangler.jsonc` veröffentlicht das aktuelle Backstage über `cloudflare-entry.mjs` mit D1, R2, WallFeed und Service-Schnittstellen. Im Ordner `admin/` heißen die Betreiberbefehle `npm test` und `npm run deploy:backstage`. Eine Veröffentlichung ist ein eigener Arbeitsschritt; ein Git-Push veröffentlicht den Worker nicht automatisch.

Die unabhängige Notfallredaktion wird ausschließlich aus `fix/legacy-cms-audit-2026-11-05` gepflegt. Dort liegt ihre eigene `admin/wrangler.production.jsonc`. Auf modernem `main` wurden die irreführende alte Produktionskonfiguration, ihr Deployment-Befehl und historische Erstinitialisierungs-/Migrationsskripte entfernt.

Bestehende Geheimnisse, Passwörter, persönliche Zugänge und Bindungen bei einer Wartung erhalten. Datenbankumstellungen benötigen aktuelle geschützte Sicherungen und eine isolierte Wiederherstellungsprüfung. Die Gäste-App verwendet einen eigenen Worker und eine Servicebindung auf das Backstage.

## CMS und regelmäßiger Website-Bau

Speichern, Veröffentlichen, von Website nehmen und Archivieren bleiben getrennte Handlungen. Die Redaktion schreibt nach Sanity. Der vorhandene GitHub-Zeitplan baut statische Seiten regelmäßig neu; GitHub kann Läufe verzögern. Es gibt keinen direkten GitHub-Aufruf und keinen zu rotierenden Build-PAT mehr. Aktuelle Inhalte werden auf der Website zusätzlich beim Laden abgefragt.

## Nach Veröffentlichung und Rückweg

Öffentliche Startseite, betroffene Detailseiten, Bilder, Impressum/Datenschutz und `/redaktion` prüfen. Die Redaktion einschließlich Anmeldung und interner Schnittstellen behält `noindex, nofollow`; öffentliche Seiten bleiben indexierbar. `noindex` ersetzt keinen Anmeldeschutz.

Bei Website-Problemen den vorherigen freigegebenen Quellcode-SHA im Produktionsworkflow wiederherstellen und erneut bauen. Das setzt keine CMS-Inhalte zurück. Worker nur gezielt mit einer kompatiblen Fassung zurücknehmen; Datenbanken und inzwischen geänderte Rechte nicht zurücksetzen. Nameserver und Mail-DNS bleiben von Code-Releases unberührt.
