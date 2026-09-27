# Rudelbar 2.0

Private Arbeitskopie für die Weiterentwicklung der Rudelbar-Website und die geplante CMS-Anbindung.

## Stand

- `site/` enthält eine Kopie des zuletzt veröffentlichten GitHub-Pages-Stands von `christopherharmszd/rudelbar-pages` (27. September 2026). Die Datei `CNAME` wurde absichtlich **nicht** übernommen: `rudelbar.de` bleibt beim bestehenden Produktions-Repository.
- `app/` enthält das ältere React/Vite-Quellprojekt als Ausgangspunkt für die Weiterentwicklung. Es ist **noch nicht** mit allen jüngeren Änderungen der veröffentlichten Website synchronisiert. Ein Build aus `app/` darf `site/` daher noch nicht ersetzen.
- Dieses Repository ist zunächst privat. Auf GitHub Free kann daraus keine GitHub-Pages-Seite veröffentlicht werden. Eine öffentliche Staging-Adresse und das CMS werden erst in einem getrennten Schritt eingerichtet.

## Lokal ansehen

Im Repository-Verzeichnis `python3 -m http.server 8767 --directory site` starten und `http://127.0.0.1:8767/` öffnen. Die Formulare nutzen bereits den echten Web3Forms-Endpunkt; Testanfragen werden tatsächlich versendet.

## Nächste Schritte

1. Den aktuellen veröffentlichten Inhalt und die letzten Formular-, Team- und Impressumsänderungen in `app/` als bearbeitbaren Quellcode zusammenführen.
2. Sanity für Termine zuerst integrieren; danach Team und weitere Texte. Inhalt, Bild-Uploads und Veröffentlichungsablauf getrennt für Staging und Produktion definieren.
3. Nach dem Abgleich eine eigene Staging-Veröffentlichung wählen und testen. Erst nach ausdrücklicher Freigabe Änderungen nach `rudelbar-pages` und damit auf `rudelbar.de` übertragen.
