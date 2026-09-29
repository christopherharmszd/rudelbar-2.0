# Rudelbar 2.0

Staging-Repository für die Weiterentwicklung der Rudelbar-Website und die CMS-Anbindung.

## Stand

- `site/` ist ein unverändertes Abbild des veröffentlichten GitHub-Pages-Stands aus `christopherharmszd/rudelbar-pages`, Commit `4318743789a5ac911edd5416d557531ec45ae5b0` vom 27. September 2026 – mit einer einzigen Ausnahme: `CNAME` wurde absichtlich **nicht** übernommen. `rudelbar.de` bleibt beim bestehenden Produktions-Repository.
- `app/` ist der bearbeitbare React/Vite-Quellcode. Termine, Teamprofile und Beiträge werden aus veröffentlichten Sanity-Inhalten geladen. Die Startseite zeigt automatisch den nächsten kommenden Termin. Der Bereich „Aktuelles“ erscheint erst mit dem ersten veröffentlichten Beitrag.
- Die Staging-Website wird aus `app/` automatisch mit GitHub Actions gebaut und unter `https://christopherharmszd.github.io/rudelbar-2.0/` veröffentlicht. Sie liest veröffentlichte Termine, Teamprofile und Beiträge aus dem Sanity-Projekt `uywmld5e`, Dataset `staging`. Die bestehende Produktionsseite bleibt separat. `/redaktion` leitet auf die Online-Redaktion weiter.
- Die Online-Redaktion läuft als Cloudflare Worker `rudelbar-cms-staging` unter `https://rudelbar-cms-staging.christopher-harms.workers.dev/`. Ihr Schreibschlüssel liegt nur in den Worker Secrets.

## Lokal ansehen

Im Repository-Verzeichnis `python3 -m http.server 8767 --directory site` starten und `http://127.0.0.1:8767/` öffnen. Für die bearbeitbare Version in `app/` `npm ci`, `npm run build` und danach im Repository-Verzeichnis `python3 -m http.server 8768 --directory app/dist/client` ausführen. Die Formulare nutzen bereits den echten Web3Forms-Endpunkt; Testanfragen werden tatsächlich versendet.

## Staging und Produktion

`rudelbar-2.0` bleibt der bearbeitbare Quellcode und die Staging-Website. Der veröffentlichte Produktions-Build wird zusätzlich im bestehenden Repository `christopherharmszd/rudelbar-pages` abgelegt. Dessen `main` steuert `rudelbar.de`. Änderungen an `app/` auf `main` hier lösen nur den Staging-Build aus.

Staging nutzt das Sanity-Dataset `staging` und den Worker `rudelbar-cms-staging`. Produktion nutzt `production` und den Worker `rudelbar-cms`. Beide Bereiche sind getrennt; ein redaktioneller Testbeitrag erscheint nicht automatisch in Produktion. Die Website liest veröffentlichte Inhalte direkt aus dem jeweiligen Dataset, ohne dass für jede Inhaltsänderung ein neuer Website-Push nötig ist.

Der Produktions-Build entsteht mit `cd app && npm run build:production && npm run test:production` in `app/dist/production`. Er enthält `CNAME` für `rudelbar.de` und die Weiterleitung `/redaktion` zur Produktions-Redaktion. Die Übernahme nach `rudelbar-pages/main` ist der eigentliche Go-live-Schritt und erfolgt erst nach der Freigabe des vorbereiteten Releases. Ablauf und Nachkontrolle stehen in [docs/production-release.md](docs/production-release.md).
