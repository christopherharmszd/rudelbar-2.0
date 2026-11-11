# Rudelbar veröffentlichen

## Architekturumbau vom 12. November 2026: noch keine neue Veröffentlichung

Die Laufzeitumstellung ist lokal geprüft und als Entwicklungsstand gesichert. Keine echten Migrationen, keine Veröffentlichung und kein Tarifwechsel vorgenommen. Aktive Worker-Versionen bleiben die unten dokumentierten vom Gäste-Einstieg V1. Vor Aktivierung die vollständige Sicherungs-/Migrations-/Synchronisierungsfolge in [Runtime-Architektur](runtime-architecture-2026-11-11.md#wiederaufnahme-und-kontrollierte-aktivierung) abarbeiten. Eine vollständig vorbereitete D1-Projektion und die private Zugriffskontrolle sind Freigabevoraussetzungen. Sanity ist derzeit gesperrt; der Inhaber lässt das Upgrade zunächst offen. Nicht stillschweigend auf den alten unbegrenzten Sanity-Abfragebetrieb zurückschalten.

## Gäste-Einstieg V1 vom 11. November 2026

Anwendungsquelle `e1a80d36f3b6fe16c3a31d7d2ed7c9d7effd0d7a` auf GitHub. Der über die verbundene GitHub-Anmeldung gesicherte Dateibaum ist exakt identisch zum lokal veröffentlichten Commit `9e6571d75cc02fe99f894e55f3757630c441c70b`; lokaler main wurde nach diesem vollständigen Vergleich auf den GitHub-Commit abgeglichen. Backstage `fd5d3df6-18d5-4a03-b7c0-56db7b79fb05`, Gäste-App `1db431e8-2b4c-47cb-b410-fe4d8ba5c564`. 258 Tests, isolierter Gesamtabend und lokale Browser-/Designabnahme einschließlich synchronisierter Vorschau erfolgreich. 22 ausgelieferte Dateien stimmen exakt mit der Quelle überein; alle abgefragten Bindungen unverändert. Website bleibt auf ihrer separat freigegebenen Quelle.

Die technische Codeveröffentlichung ist abgeschlossen. **Die Online-Abnahme des sichtbaren Abends ist blockiert:** Bereits vor dem Deployment meldete Backstage ein ausgeschöpftes Sanity-API-Limit; der private Gästezugang liefert weiterhin HTTP 503. Keine vollständige Live-Abnahme behaupten, bis der Datenabruf wieder funktioniert. Keine Daten, Rollen, Schema oder Tarife geändert. [Umfang, Grenzen und Rückweg](guest-arrival-2026-11-11.md). Changelog V1.7 erhält die früheren PDFs.

Zusammengehöriger vorheriger Codestand: Backstage `ca0bb36b-b4a9-44c0-aa28-22ff69a160ce`, Gäste-App `5a5d6b90-4795-4469-9b2a-f4a1d8cae938`. Eine Code-Rücknahme setzt keine Inhalte zurück und hebt das Anbieterlimit nicht auf.

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

Entwurf 11 unter https://christopherharmszd.github.io/rudelbar-2.0/freigabe/ ergänzt Fragen im Hauptmenü auf Desktop und mobil, die Suche in Fragen und Antworten sowie den neu geordneten Footer. Diese ausdrückliche Entscheidung vom 9. November ersetzt die frühere Beschränkung auf sechs Desktop-Menüpunkte. Inhalt und übrige Gestaltung bleiben 10. Versionen 02–11 sind über Vergleichsleiste und feste Links erreichbar. Historische Inhalte und gemeinsame Assets sind per SHA-256 gesperrt. [Prüfung und Umfang](review-11-2026-11-09.md), [Quelle und Grenzen](../previews/brand-2026-11-08/README.md).

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

## App-Brand-Release vom 10. November 2026

Quelle `83a3527ae2f4bebc6b47a9ac9ee65a73331f0882` ist auf den beiden bestehenden Workern veröffentlicht: Backstage `24bab839-2457-41cb-ac9f-58e75e8c8651`, Gäste-App `b207c53b-e54c-4851-9734-212d48d191ae`. D1, private EU-R2-Ablage, WallFeed, Rate-Limiter, Zeitplan, Zugangswerte und Servicebindung bleiben erhalten. Kein Datenbankschema wurde geändert.

`shared/brand/` ist die einzige Quelle für Palette, Schriften und Lizenzen. Beide Worker-Builds bereiten ihre Kopien einschließlich authentifizierter Gästevorschau über `event-app/prepare.mjs` vor. Generierte Ordner sind keine zweite bearbeitbare Quelle. Beim Rückweg beide zusammengehörigen Worker-Stände berücksichtigen; keine Inhaltsdaten oder Konten zurücksetzen.

234 Tests, isolierte Gesamtprüfung und Dateihashes der tatsächlichen Online-Ausgabe erfolgreich. Die öffentliche Website bleibt auf ihrem separat freigegebenen Quellcode-Stand. [Entscheidungen und Nachweise](app-brand-2026-11-10.md).

## Mobile App-Korrekturen vom 11. November 2026

Quelle `9a4eb55b4fa579f8302464e38b501d85746985c6`: Backstage/Live `65daf458-d986-4f25-b411-ebfea6ac7d4c`, Gäste-App `ef116ae3-5b35-499d-ae99-180ff9ff5635`. Deckende Symbole/Teilen-Bild, gemeinsame Mitteilungseinrichtung und Memory-Wall-Fotokorrekturen. 243 Tests, isolierter Gesamtabend und Browserprüfungen erfolgreich; 23 tatsächliche Online-Dateien mit der Quelle abgeglichen. Alle abgefragten Bindungen vor/nach dem Release identisch; keine Migration. Website unverändert auf `c5178a1b099fad1d7baee4013921d891925b1038`.

[Umfang, Belege, offene Geräteprüfung und vorherige Worker-Versionen](mobile-fixes-2026-11-11.md). Ein neuer PDF-Changelog V1.2 hält diesen Stand fest; vorherige Fassungen werden nicht überschrieben. Die App-Bilder haben neue Dateinamen; vorhandene Betriebssystem-/Messenger-Caches sind nur am tatsächlichen Gerät zu beurteilen.

## Memory-Wall-Sitzungsfix vom 11. November 2026

Quelle `6c0b9c52977bc73da0f5e1bcb9d21be7b0f32b4c`: Backstage/Live `8cb9b8fe-b44c-41ea-ad82-a60ba61bee50`, Gäste-App `13d2b20c-d8aa-4d0a-b105-c4f04a2eb805`. Gültige Cookie-Ablaufzeit nach Mitteilungsbestätigung; rote, fokussierte Fehlermeldung mit expliziter Wiederanmeldung und Erhalt des offenen Wall-Entwurfs. 249 Tests, vollständige isolierte Ablaufprüfung einschließlich Cookie-Regression und 24 Online-Dateivergleiche erfolgreich. Bindungen unverändert; keine Migration. Website-Quelle bleibt unverändert.

[Befund, Nachweis, Rückweg und separat gesammeltes Feedback](wall-session-2026-11-11.md). PDF-Changelog V1.3 hält diesen begrenzten Fix fest. Die Ursache des konkreten iPhone-Sitzungsverlusts ist nicht abschließend nachgewiesen; echte Geräteabnahme bleibt offen.


## Profil und Gastzugang vom 11. November 2026

Quelle `d83a495a66f4e36064ee5c397c993a42d3fe9e51`: Backstage/Live `2e52e7b5-2611-4b25-8aa7-ed4c04df8eb2`, Gäste-App `b686b404-884e-4b60-bf7b-827647516459`. Zentraler Profilbereich neben der Glocke, bestätigter Gaststatus und gemeinsame ausdrückliche Wiederanmeldung mit erhaltenem Wall-Entwurf. 256 Tests, isolierter Gesamtabend und Browserprüfung erfolgreich; 32 tatsächliche Online-Dateien abgeglichen. Bindungen, Datenbankschema, Konten und reale Inhalte unverändert. Website weiterhin separat auf ihrer freigegebenen Quelle.

[Umfang, Nachweise, Rückweg und separat offene Rückmeldungen](guest-profile-2026-11-11.md). Neue versionierte Changelog-PDF V1.4; ältere Fassungen bleiben erhalten. Bestehende Freigabeentscheidungen werden weder pauschal ersetzt noch durch das bloße Öffnen erteilt. Echte Geräteabnahme bleibt offen.

## CMS und regelmäßiger Website-Bau

Speichern, Veröffentlichen, von Website nehmen und Archivieren bleiben getrennte Handlungen. Die Redaktion schreibt nach Sanity. Der vorhandene GitHub-Zeitplan baut statische Seiten regelmäßig neu; GitHub kann Läufe verzögern. Es gibt keinen direkten GitHub-Aufruf und keinen zu rotierenden Build-PAT mehr. Aktuelle Inhalte werden auf der Website zusätzlich beim Laden abgefragt.

## Nach Veröffentlichung und Rückweg

Öffentliche Startseite, betroffene Detailseiten, Bilder, Impressum/Datenschutz und `/redaktion` prüfen. Die Redaktion einschließlich Anmeldung und interner Schnittstellen behält `noindex, nofollow`; öffentliche Seiten bleiben indexierbar. `noindex` ersetzt keinen Anmeldeschutz.

Bei Website-Problemen den vorherigen freigegebenen Quellcode-SHA im Produktionsworkflow wiederherstellen und erneut bauen. Das setzt keine CMS-Inhalte zurück. Worker nur gezielt mit einer kompatiblen Fassung zurücknehmen; Datenbanken und inzwischen geänderte Rechte nicht zurücksetzen. Nameserver und Mail-DNS bleiben von Code-Releases unberührt.

## Leinwand-Button vom 11. November 2026

Quelle `18aead41a8460cff6c0d41fdbdcc7e2803c13095` ist auf Backstage `1b72f858-6ba9-4ce6-b206-2e972a2a4669` veröffentlicht. Die gemeinsame Wall-CSS-Quelle grenzt die Goldfarbe normaler Links gegen Button-Links ab; der Team-Einstieg lädt die neue Stilversion. Online-Schriftfarbe und Hintergrund visuell sowie per berechnetem Stil geprüft. Beide geänderten ausgelieferten Dateien stimmen mit der Quelle überein. 238 Backendtests erfolgreich, Bindungen unverändert. Keine Datenänderung. Gäste-Worker bleibt `b686b404-884e-4b60-bf7b-827647516459`, öffentliche Website auf ihrer bisherigen Quelle. Rückweg für diesen begrenzten Fix: Backstage `2e52e7b5-2611-4b25-8aa7-ed4c04df8eb2`. Changelog V1.5 ergänzt die unveränderten Vorversionen.

## Gast-App-Reset vom 11. November 2026

Quelle `f0e7cd13b876e25e808d974e10eee1c06b4bfc2f`: Backstage `ca0bb36b-b4a9-44c0-aa28-22ff69a160ce`, Gäste-App `5a5d6b90-4795-4469-9b2a-f4a1d8cae938`. Ein bestätigter Neustart beendet den Gastzugang über die bestehende Logout-Schnittstelle, entfernt nur die lokalen Einstellungen des aktuellen Abends und lädt denselben Link neu. Misslingt die Abmeldung, bleiben die lokalen Einstellungen für einen erneuten Versuch erhalten. Ein Reload leert auch die bisherigen Ansichten und Entwürfe im Speicher. Die notwendige Browser-/Betriebssystem-Erlaubnis für Mitteilungen wird nicht zurückgesetzt. Notification-Einstellungen verwenden jetzt auch beim allgemeinen App-Einstieg die erst nach dem Laden feststehende Abend-ID, statt einen leeren Speicherbereich zu verwenden.

258 Tests erfolgreich, Abbruch und vollständiger Reset ausschließlich lokal mit fiktiven Daten geprüft. Erneute Anmeldung und Hinweiston-Einrichtung beginnen frisch. Online nur den Dialog und Abbruch geprüft; vorhandenen Gastzugang erhalten. 16 ausgelieferte Gast-, Vorschau- und gemeinsame Dateien stimmen mit der Quelle überein. Alle Worker-Bindungen erhalten, keine Migration. Öffentliche Website weiter auf `c5178a1b099fad1d7baee4013921d891925b1038`. Vorheriger zusammengehöriger Rückweg: Backstage `1b72f858-6ba9-4ce6-b206-2e972a2a4669`, Gäste-App `b686b404-884e-4b60-bf7b-827647516459`. Keine Daten zurücksetzen. Changelog-PDF V1.6 ergänzt V1.5; echte iPhone-/Android-Abnahme bleibt offen.
