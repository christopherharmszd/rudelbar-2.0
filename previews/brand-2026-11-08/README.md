# Rudelbar Freigabevorschau · Entwurf 04

Stand: 8. November 2026. Öffentliche Designprüfung, keine freigegebene Produktionswebsite.

URL: https://christopherharmszd.github.io/rudelbar-2.0/freigabe/

Dieser eingefrorene Prototyp folgt Brand Guide V1.4, Website-Textvorlage V1.0 und den Entscheidungen des Inhabers. Gäste und Orte sind gleich wichtig. Der Gemeinschaftsblock ersetzt die Gründerporträts auf der Startseite; die Teamseite bleibt erhalten. Aktuelles heißt Rudelgeschichten. Vergangene Termine erscheinen kompakt unter den kommenden Abenden. Die App ist in Entwicklung und Erprobung, Early Access geplant.

Die Darstellung entspricht dem geprüften lokalen Entwurf 04. Für die Veröffentlichung wurden nur die Vorschauhinweise angepasst, der ausschließlich lokal verfügbare Vorher-Vergleich entfernt und der Bildbestand auf die sichtbaren Dateien begrenzt. Das im Guide zur Elternfreigabe offene dritte Galeriebild ist weder im Datenpaket noch in den Assets enthalten. Schriftdateien und Bilder werden vollständig von GitHub Pages geladen.

## Betrieb

Der Staging-Workflow kopiert diesen Ordner nach dem normalen Website-Bau ausschließlich nach app/dist/client/freigabe. Die normale Testwebsite bleibt am bisherigen Ort. Der Produktions-Build übernimmt diesen Ordner nicht. Kein CNAME, keine Änderung an DNS, Domains, Workern, Zugangswerten oder Sanity-Datasets.

Alle Inhalte sind ein eingefrorener öffentlicher Stand. Es gibt keine Sanity-Verbindung. Das Studio und die Zustandsauswahl speichern nur im Browser des jeweiligen Betrachters; die Formulare versenden keine Nachrichten. Alle Routen sind unter diesem Ordner erreichbar und tragen noindex, nofollow, noarchive. Der Vorher-Vergleich und interne Prüfdokumente bleiben lokal.

Geprüfte Hauptseiten: Start, Für euren Ort, Termine, Über uns, Rudelgeschichten, Rückblick und Kontakt. Für die spätere Umsetzung bleiben die Backend-Kurztextpflege und die weiteren im lokalen Prüfprotokoll dokumentierten offenen Punkte separat erforderlich.
