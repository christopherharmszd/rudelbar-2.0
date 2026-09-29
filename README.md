# Rudelbar 2.0

Staging-Repository für die Weiterentwicklung der Rudelbar-Website und die CMS-Anbindung.

## Stand

- `site/` ist ein unverändertes Abbild des veröffentlichten GitHub-Pages-Stands aus `christopherharmszd/rudelbar-pages`, Commit `4318743789a5ac911edd5416d557531ec45ae5b0` vom 27. September 2026 – mit einer einzigen Ausnahme: `CNAME` wurde absichtlich **nicht** übernommen. `rudelbar.de` bleibt beim bestehenden Produktions-Repository.
- `app/` ist der bearbeitbare React/Vite-Quellcode. Termine und Teamprofile können nach Konfiguration aus veröffentlichten Sanity-Inhalten geladen werden. Ohne diese Konfiguration bleiben die bisherigen Inhalte als lokale Vorschau sichtbar. Die Startseite zeigt automatisch den nächsten kommenden Termin; die Terminseite und Teamseite berücksichtigen die redaktionelle Reihenfolge.
- Die Staging-Website wird aus `app/` automatisch mit GitHub Actions gebaut und unter `https://christopherharmszd.github.io/rudelbar-2.0/` veröffentlicht. Sie liest veröffentlichte Termine und Teamprofile aus dem Sanity-Projekt `uywmld5e`, Dataset `staging`. Die bestehende Produktionsseite bleibt separat. `/redaktion` leitet auf die Online-Redaktion weiter.
- Die Online-Redaktion läuft als Cloudflare Worker `rudelbar-cms-staging` unter `https://rudelbar-cms-staging.christopher-harms.workers.dev/`. Ihr Schreibschlüssel liegt nur in den Worker Secrets.

## Lokal ansehen

Im Repository-Verzeichnis `python3 -m http.server 8767 --directory site` starten und `http://127.0.0.1:8767/` öffnen. Für die bearbeitbare Version in `app/` `npm ci`, `npm run build` und danach im Repository-Verzeichnis `python3 -m http.server 8768 --directory app/dist/client` ausführen. Die Formulare nutzen bereits den echten Web3Forms-Endpunkt; Testanfragen werden tatsächlich versendet.

## Nächste Schritte

1. Unter `admin/` liegen die Redaktionsoberfläche und ihr Cloudflare Worker für Termine und Teamprofile; Details stehen in `admin/README.md`.
2. Änderungen an `app/` auf `main` lösen den GitHub-Pages-Build automatisch aus. Inhalte, die in der Redaktion veröffentlicht werden, liest die Website direkt aus Sanity; dafür ist kein neuer Push nötig.
3. GitHub Pages hostet die öffentliche Website einschließlich der kurzen Weiterleitung `/redaktion`. Die eigentliche Anmeldung und alle Schreibzugriffe laufen über den Cloudflare Worker. Beim Produktions-Build muss `RUDELBAR_CMS_URL` auf die separate Produktions-Redaktion zeigen; ohne diesen Wert bricht ein Build für das `production`-Dataset ab.
4. Erst nach ausdrücklicher Freigabe Änderungen nach `rudelbar-pages` und damit auf `rudelbar.de` übertragen. Das `production`-Dataset und ein eigener Produktions-Worker bleiben bis dahin getrennt von Staging.
