# Rudelbar 2.0

Private Arbeitskopie für die Weiterentwicklung der Rudelbar-Website und die geplante CMS-Anbindung.

## Stand

- `site/` ist ein unverändertes Abbild des veröffentlichten GitHub-Pages-Stands aus `christopherharmszd/rudelbar-pages`, Commit `4318743789a5ac911edd5416d557531ec45ae5b0` vom 27. September 2026 – mit einer einzigen Ausnahme: `CNAME` wurde absichtlich **nicht** übernommen. `rudelbar.de` bleibt beim bestehenden Produktions-Repository.
- `app/` ist der bearbeitbare React/Vite-Quellcode. Teamfotos, Impressum, aktuelle Texte, das Eventformular mit Ort und Datum sowie der Web3Forms-Versand sind in den Quellcode übernommen. Der lokale Build wurde für Startseite, Termine, Rudel, Event, Kontakt und Impressum mit `site/` verglichen: sichtbare Texte und Bilder stimmen überein. Dies ist jetzt die Grundlage für Rudelbar 2.0.
- Dieses Repository ist zunächst privat. Auf GitHub Free kann daraus keine GitHub-Pages-Seite veröffentlicht werden. Eine öffentliche Staging-Adresse und das CMS werden erst in einem getrennten Schritt eingerichtet.

## Lokal ansehen

Im Repository-Verzeichnis `python3 -m http.server 8767 --directory site` starten und `http://127.0.0.1:8767/` öffnen. Für die bearbeitbare Version in `app/` `npm ci`, `npm run build` und danach im Repository-Verzeichnis `python3 -m http.server 8768 --directory app/dist/client` ausführen. Die Formulare nutzen bereits den echten Web3Forms-Endpunkt; Testanfragen werden tatsächlich versendet.

## Nächste Schritte

1. Sanity für Termine zuerst integrieren; danach Team und weitere Texte. Inhalt, Bild-Uploads und Veröffentlichungsablauf getrennt für Staging und Produktion definieren.
2. Eine eigene Staging-Veröffentlichung wählen und testen. Erst nach ausdrücklicher Freigabe Änderungen nach `rudelbar-pages` und damit auf `rudelbar.de` übertragen.
3. Das frühere Cloudflare-Projekt erst nach Bestätigung der genauen Ziele und Prüfung noch bestehender Abhängigkeiten entfernen. Es ist nicht mehr Grundlage der Weiterentwicklung.
