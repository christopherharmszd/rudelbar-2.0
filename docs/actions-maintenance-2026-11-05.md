# GitHub-Actions-Wartung: 5. November 2026

Die Node.js-20-Warnungen der Veröffentlichungsautomatik sind behoben. Sowohl Test- als auch Produktionswebsite wurden danach vollständig gebaut, getestet und veröffentlicht. Die Protokolle beider Jobs in beiden Umgebungen enthalten keine Warnungen.

## Gezielt aktualisierte Bausteine

| Action | Vorher | Jetzt |
| --- | --- | --- |
| actions/setup-node | v4 | v7.1.0 |
| actions/configure-pages | v5 | v6.0.0 |
| actions/upload-pages-artifact | v4 | v5.0.0 |
| actions/deploy-pages | v4 | v5.0.1 |

Die offiziellen Action-Definitionen wurden vor dem Commit geprüft. Alle ausführbaren Actions laufen mit Node24; der neue zusammengesetzte Uploader verwendet ebenfalls einen Node24-Uploader. checkout v6 war bereits kompatibel und blieb unverändert. Der eigentliche Website-Bau verwendet weiterhin Node22.

## Geprüfte Veröffentlichung

- Staging: [vollständiger erfolgreicher Lauf](https://github.com/christopherharmszd/rudelbar-2.0/actions/runs/42123530676), 12 Tests bestanden, Bau und Veröffentlichung ohne Warnungen. [PR #3](https://github.com/christopherharmszd/rudelbar-2.0/pull/3).
- Produktion: [vollständiger erfolgreicher Lauf](https://github.com/christopherharmszd/rudelbar-pages/actions/runs/42123896653), 12 Tests bestanden, Bau und Veröffentlichung ohne Warnungen. [PR #4](https://github.com/christopherharmszd/rudelbar-pages/pull/4).
- Die tatsächlichen Seiten, JavaScript/CSS, das 192-Pixel-Favicon, Datenschutz und Redaktionseinstieg wurden nach dem Release erfolgreich abgerufen. Produktion bleibt indexierbar, Staging bleibt noindex.
- Die veröffentlichte Produktionsquelle bleibt ab5395d1e0a1bd0190564f6e32a9ee7066c221a9. Die CMS-Revisionen waren vor und nach dieser Wartung identisch.

## Umfang und Rückkehr

Pro Repository wurden ausschließlich die vier Action-Referenzen im Workflow geändert. Website-Code, Sanity-Konfiguration und -Inhalte, Cloudflare Worker, Berechtigungen, Build-Befehle, Zielverzeichnisse, Domain und Zeitpläne bleiben unverändert. Es wurde kein neuer Zugangsschlüssel angelegt.

Ausgangsstand: rudelbar-2.0/a4241161ea642f228bb91b41f365975b6e56fd62 und rudelbar-pages/009eaa5f226bf86e4f6af8d077c384fa0de4492c. Staging-Merge c8dc7e230f587ebe35555f3167a0391c31e5923a; Produktions-Merge 44317175283269586ab716b3880527d3fadf9f82. Bei einer Regression kann die jeweilige Workflow-Änderung gezielt zurückgenommen werden, ohne den Website-Quellcode auszutauschen.

Warnungen früherer abgeschlossener Läufe bleiben dort als historische Einträge sichtbar. Für die Abnahme sind die oben verlinkten neuen Läufe maßgeblich.

Weitere offene Betreiberpunkte, insbesondere Google Search Console, bleiben in CURRENT.md und NEXT-STEPS.md dokumentiert.
