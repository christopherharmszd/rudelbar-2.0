# Rudelbar CMS

Das [integrierte Backstage](../BACKSTAGE.md) ist seit 2. November 2026 der Haupteinstieg über `https://rudelbar.de/redaktion`. Im Bereich Website öffnet Bisherige Redaktion den unabhängigen Notfallzugang unter `rudelbar-cms.christopher-harms.workers.dev`; eine erneute Anmeldung kann erforderlich sein. Eigenständiger Live-Einstieg: `/live`. Der bestehende Zugang Redaktion bleibt aktiv.

Die öffentliche Staging-Website liegt auf GitHub Pages und liest weiterhin `staging`. Das reale Backstage im historisch benannten Worker `rudelbar-cms-staging` nutzt seit 2. November 2026 für Website-Inhalte `SANITY_WEBSITE_DATASET=production`. Die bisherige Oberfläche `/` und das integrierte `/backstage#website` bearbeiten denselben Produktionsbestand wie der bestehende Worker `rudelbar-cms`. Interne App-Daten bleiben über `SANITY_DATASET=staging` im bisherigen Bestand. Die Produktionswebsite und ihr Build werden durch diese Anbindung nicht neu bereitgestellt.

## Für Redakteurinnen und Redakteure

In der Online-Redaktion steht das gemeinsame Konto **Redaktion** bereits fest. Es wird nur das Redaktionspasswort eingegeben; ein Sanity-Konto ist nicht nötig. Alle Angemeldeten können Termine, Teamprofile und Beiträge unter „Aktuelles“ als Entwurf speichern, veröffentlichen und wieder von der Website nehmen. Teamfotos und bis zu 12 Beitragsbilder mit optionaler eigener Bildbeschreibung und Bildunterschrift lassen sich hochladen. Bleibt die Bildbeschreibung leer, wird beim Speichern der Kurztext des Beitrags übernommen. Mit **Kurztext übernehmen** lässt er sich sofort in das Feld kopieren und bearbeiten. Zum Sortieren zieht man das Bild oder den Kartenkopf an die sichtbar markierte Stelle; die Pfeiltasten bleiben als Alternative erhalten. Das erste, farblich markierte Bild ist das Titelbild. Einträge stehen zunächst als kompakte Liste da; das Formular öffnet sich nach Auswahl in einem Dialog, auf dem Handy bildschirmfüllend.

Für Termine entstehen Google-Maps-Suchlinks ohne kostenpflichtige API automatisch aus Ort und Adresse. Ein genauer Link aus Google Maps kann stattdessen eingefügt und vor der Veröffentlichung geprüft werden.

Die Reihenfolge steuert die Termin- und Teamübersicht. Auf der Startseite erscheint unabhängig davon automatisch der nächste veröffentlichte Termin nach Datum. Änderungen werden erst nach **Entwurf speichern** und **Veröffentlichen** öffentlich sichtbar.

Beiträge werden nach Datum sortiert. Solange kein Beitrag veröffentlicht ist, gibt es auf der Website weder den Menüpunkt noch den Abschnitt „Aktuelles“. Nach der ersten Veröffentlichung erscheinen Startseiten-Vorschau, Übersicht und die einzelnen Beiträge automatisch beim nächsten Laden.

Termine und Beiträge haben die Ansichten **Aktiv** und **Archiviert**. „Von Website nehmen“ behält einen Eintrag als aktiven Entwurf. „Archivieren“ nimmt ihn ebenfalls von der Website und verschiebt ihn in das Archiv. Nach „Wiederherstellen“ liegt er als unveröffentlichter Entwurf unter Aktiv; für die Website muss er erneut veröffentlicht werden. **Endgültig löschen** ist nur im Archiv verfügbar und entfernt den Eintrag aus dem Dataset. Zugehörige Bilddateien werden dabei nicht automatisch aus dem Sanity-Medienspeicher gelöscht und können noch in Caches vorhanden sein. Teamprofile bleiben von diesem Archivablauf unberührt.

## Onlinebetrieb

- Cloudflare-Konto: `87e06345951a028223b167dd69056336`
- Worker: `rudelbar-cms-staging`
- Sanity: Projekt `uywmld5e`; Website-Inhalte `production`, interne App-Daten `staging`
- Login: festes Konto `redaktion@rudelbar.local`, in der Oberfläche als **Redaktion** angezeigt
- Der Sanity-Schreibschlüssel, der Sitzungsschlüssel und der Passwortprüfwert sind nur Cloudflare Worker Secrets. Sie dürfen weder in Git noch in Browsercode stehen.

Der Worker liefert die Oberfläche und `/api/*` unter derselben Webadresse aus. Die Anmeldung wird serverseitig geprüft; Sitzungen haben ein signiertes, `HttpOnly`-, `Secure`- und `SameSite=Strict`-Cookie. Schreibzugriffe benötigen zusätzlich einen CSRF-Wert. Anmeldeversuche sind durch ein Cloudflare Rate-Limit begrenzt. Ein Passwortwechsel entwertet bestehende Sitzungen.

### Bauen und veröffentlichen

Im Ordner `admin/`: `npm ci`, `npm test`, bei einem beauftragten Worker-Release `npm run deploy:backstage`.

`admin/wrangler.jsonc` gehört zum aktuellen Backstage einschließlich D1, R2 und WallFeed. Der historische Name `rudelbar-cms-staging` bezeichnet den tatsächlich genutzten Dienst. Bestehende Secrets und Bindungen erhalten. Kein automatischer Worker-Deploy durch einen Git-Push.

Der unabhängige Notfallzugang bleibt ausdrücklich erhalten. Sein eigener Quellcode einschließlich Produktionskonfiguration liegt ausschließlich auf `fix/legacy-cms-audit-2026-11-05`. Modernen Backstage-Code nicht auf diesen Worker übertragen. Die irreführende alte Produktionskonfiguration und Erstinitialisierungsskripte wurden aus modernem `main` entfernt.

Ein Passwortwechsel ist ein eigener Betreiberauftrag. Bestehende Passwörter, Sitzungs- und Sanity-Schlüssel werden bei einem Code-Release nicht erneuert. Keine historischen Migrations- oder Befüllungsskripte über echte Inhalte laufen lassen.

`/api/upload` speichert Website-Bilder in `production`; `/api/upload/app` speichert interne Bilder in `staging`. Es gibt keinen direkten GitHub-Build-Aufruf und keinen zusätzlichen GitHub-Build-Schlüssel mehr. Statische Seiten werden nach dem vorhandenen Zeitplan gebaut.

Aktueller [Veröffentlichungsablauf](../docs/production-release.md).

### Lokal testen

Mit einer Git-ignorierten `admin/.dev.vars`-Datei, die dieselben drei Worker Secrets enthält, im Ordner `admin/` `npm run dev:worker` starten. Die lokale Oberfläche liegt auf `http://127.0.0.1:8788/`. Der bisherige Node-Server `admin/server.mjs` bleibt als lokale Vergleichsmöglichkeit erhalten; seine früheren Rollen `editor` und `publisher` gelten nicht für den Online-Worker.

## Website

Der GitHub-Pages-Workflow in `.github/workflows/pages.yml` baut die öffentliche [Staging-Website](https://christopherharmszd.github.io/rudelbar-2.0/) mit `VITE_SANITY_PROJECT_ID=uywmld5e` und `VITE_SANITY_DATASET=staging`. Diese historische Vorschau ist kein Nachweis für den aktuellen Website-Inhalt aus Backstage. Nach Veröffentlichung in den gemeinsam angebundenen Website-Oberflächen zeigt `rudelbar.de` den Produktionsinhalt beim nächsten Laden. Der Browser erhält keinen Schreibschlüssel. Entwicklungstests verwenden isolierte Fixtures; auch ein lokaler Worker mit der regulären Konfiguration verbindet sich mit den echten Beständen.


## Abendplanung für die Besucher-App

Die Staging-Redaktion enthält unter `/abendplan.html` eine Angebotsverwaltung und die Vorbereitung/Veröffentlichung einzelner Abende. Details, Grenzen und Prüfungen stehen in [event-app/README.md](../event-app/README.md). Die bestehende Produktionskonfiguration bleibt unverändert.
