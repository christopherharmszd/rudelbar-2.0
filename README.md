# Rudelbar 2.0

Bearbeitbare Quelle für Website, Redaktion und Gäste-App. Der historische Ordner site/ bleibt als alter Website-Snapshot erhalten und ist kein aktuelles Deployment.

- app/ enthält die öffentliche React/Vite-Website. Sie baut eigene HTML-Seiten aus veröffentlichten Sanity-Inhalten und aktualisiert diese zusätzlich im Browser. Die Startseite zeigt den nächsten kommenden Termin. Aktuelles erscheint mit dem ersten veröffentlichten Beitrag.
- admin/ enthält den aktuellen Backstage- und Servercode. event-app/ enthält die Gäste-Oberfläche; shared/ gemeinsame Regeln.
- Quellcode-main veröffentlicht die Testwebsite unter https://christopherharmszd.github.io/rudelbar-2.0/ mit dem Dataset staging und noindex.
- https://rudelbar.de/ bleibt beim Produktions-Repository christopherharmszd/rudelbar-pages. Dessen Produktionsworkflow baut einen festen freigegebenen Quellcode-Commit aus diesem Repository. Ein späterer main-Push wird nicht automatisch neuer Produktionscode.
- Publish, Unpublish und Archivieren starten den Produktionsseitenbau. Ein regelmäßiger Build dient als Rückfallebene. Neue Detailseiten, Sitemap und Social-Metadaten entstehen mit dem nächsten erfolgreichen Build; Sanity-Inhalte werden auf geöffneten Seiten zusätzlich aktuell geladen.
- /redaktion leitet auf den vorhandenen Backstage-Einstieg weiter. Sein historisch benannter Worker rudelbar-cms-staging bearbeitet öffentliche Website-Inhalte ausdrücklich im Dataset production. Interne App-Daten bleiben im Dataset staging. Keine automatische Inhaltskopie.
- Die unabhängige Notfallredaktion rudelbar-cms bleibt ein eigener älterer Dienst. Ihr gezielter Audit-Hotfix liegt auf fix/legacy-cms-audit-2026-11-05. Nicht mit dem modernen Backstage-Code überschreiben.

## Lokal

Im Ordner app/ npm ci ausführen. npm run build und npm test prüfen Staging; npm run build:production und npm run test:production prüfen Produktion. Ausgaben: app/dist/client und app/dist/production. Für richtige Unterseiten einen Server mit Verzeichnis-index.html und eigener 404.html verwenden.

Die Formulare verwenden den echten Web3Forms-Endpunkt. Testanfragen werden tatsächlich versendet.

## Verbindlicher Betriebsstand

[Website-Release und Live-Abgleich vom 5. November](docs/website-audit-release-2026-11-05.md) beschreibt Seitenbau, feste Produktionsfreigabe, Token-Ablauf und Rückkehr.

[Backstage-Betriebsstand](docs/CURRENT.md) und [Betriebsleitfaden](docs/betrieb-gaeste-app.md) beschreiben den zuletzt verifizierten Gäste-/Live-Funktionsstand. Die damalige echte iPhone-/Android-Abnahme bleibt eine gesonderte offene Aufgabe. Dieses Website-Release verändert weder Datenbankschema noch Gäste-App, Passwörter, Mailkonfiguration oder Inhaltsbestände.
