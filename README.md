# Rudelbar 2.0

Private Arbeitskopie für die Weiterentwicklung der Rudelbar-Website und die geplante CMS-Anbindung.

## Stand

- `site/` ist ein unverändertes Abbild des veröffentlichten GitHub-Pages-Stands aus `christopherharmszd/rudelbar-pages`, Commit `4318743789a5ac911edd5416d557531ec45ae5b0` vom 27. September 2026 – mit einer einzigen Ausnahme: `CNAME` wurde absichtlich **nicht** übernommen. `rudelbar.de` bleibt beim bestehenden Produktions-Repository.
- `app/` ist der bearbeitbare React/Vite-Quellcode. Termine und Teamprofile können nach Konfiguration aus veröffentlichten Sanity-Inhalten geladen werden. Ohne diese Konfiguration bleiben die bisherigen Inhalte als lokale Vorschau sichtbar. Die Startseite zeigt automatisch den nächsten kommenden Termin; die Terminseite und Teamseite berücksichtigen die redaktionelle Reihenfolge.
- Dieses Repository ist zunächst privat. Auf GitHub Free kann daraus keine GitHub-Pages-Seite veröffentlicht werden. Eine öffentliche Staging-Adresse und das CMS werden erst in einem getrennten Schritt eingerichtet.

## Lokal ansehen

Im Repository-Verzeichnis `python3 -m http.server 8767 --directory site` starten und `http://127.0.0.1:8767/` öffnen. Für die bearbeitbare Version in `app/` `npm ci`, `npm run build` und danach im Repository-Verzeichnis `python3 -m http.server 8768 --directory app/dist/client` ausführen. Die Formulare nutzen bereits den echten Web3Forms-Endpunkt; Testanfragen werden tatsächlich versendet.

## Nächste Schritte

1. Unter `admin/` liegt jetzt eine eigenständige Redaktionsoberfläche für Termine und Teamprofile. Sie zeigt ohne Konfiguration eine schreibgeschützte lokale Vorschau. Für den Schreibbetrieb braucht sie ein Sanity-Projekt, technische Zugangsdaten und einen Node-Host; Details stehen in `admin/README.md`.
2. Das angelegte Sanity-Projekt `h34z7ud0` und Dataset `staging` mit einem technischen Editor-Token und Redaktionszugängen verbinden. Die lokale Website liest bereits aus dem noch leeren Dataset. Danach die Veröffentlichung und die mobile Darstellung mit echten Daten prüfen.
3. Eine eigene Staging-Veröffentlichung wählen und testen. Erst nach ausdrücklicher Freigabe Änderungen nach `rudelbar-pages` und damit auf `rudelbar.de` übertragen.
4. Das frühere Cloudflare-Projekt erst nach Bestätigung der genauen Ziele und Prüfung noch bestehender Abhängigkeiten entfernen. Es ist nicht mehr Grundlage der Weiterentwicklung.
