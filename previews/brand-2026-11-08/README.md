# Rudelbar Freigabevorschau · Entwurf 05

Stand: 8. November 2026. Öffentliche Designprüfung, keine freigegebene Produktionswebsite.

URL: https://christopherharmszd.github.io/rudelbar-2.0/freigabe/

Dieser eingefrorene Prototyp folgt Brand Guide V1.4, Website-Textvorlage V1.0 und den Entscheidungen des Inhabers. Gäste und Orte sind gleich wichtig. Der Gemeinschaftsblock ersetzt die Gründerporträts auf der Startseite; die Teamseite bleibt erhalten. Aktuelles heißt Rudelgeschichten. Vergangene Termine erscheinen kompakt unter den kommenden Abenden. Die App ist in Entwicklung und Erprobung, Early Access geplant.

Die Darstellung entspricht dem geprüften lokalen Entwurf 04. Für die Veröffentlichung wurden nur die Vorschauhinweise angepasst, der ausschließlich lokal verfügbare Vorher-Vergleich entfernt und der Bildbestand auf die sichtbaren Dateien begrenzt. Das im Guide zur Elternfreigabe offene dritte Galeriebild ist weder im Datenpaket noch in den Assets enthalten. Schriftdateien und Bilder werden vollständig von GitHub Pages geladen.

## Betrieb

Der Staging-Workflow kopiert diesen Ordner nach dem normalen Website-Bau ausschließlich nach app/dist/client/freigabe. Die normale Testwebsite bleibt am bisherigen Ort. Der Produktions-Build übernimmt diesen Ordner nicht. Kein CNAME, keine Änderung an DNS, Domains, Workern, Zugangswerten oder Sanity-Datasets.

Alle Inhalte sind ein eingefrorener öffentlicher Stand. Es gibt keine Sanity-Verbindung. Das Studio und die Zustandsauswahl speichern nur im Browser des jeweiligen Betrachters; die Formulare versenden keine Nachrichten. Alle Routen sind unter diesem Ordner erreichbar und tragen noindex, nofollow, noarchive. Der Vorher-Vergleich und interne Prüfdokumente bleiben lokal.

Geprüfte Hauptseiten: Start, Für euren Ort, Termine, Über uns, Rudelgeschichten, Rückblick und Kontakt. Für die spätere Umsetzung bleiben die Backend-Kurztextpflege und die weiteren im lokalen Prüfprotokoll dokumentierten offenen Punkte separat erforderlich.

## Vergleichsstände

Die obere Leiste „Versionen vergleichen“ bietet feste Links zu Entwurf 02 (lokaler GTM-Prototyp), 03 (lokaler Brand-Guide-Prototyp), 04 (erste öffentliche Freigabe, Commit 9bf6b38) und 05 (Versionsnavigation, kurzer App-Status Early Access). Frühere lokale Stände werden ausdrücklich als solche gekennzeichnet. Die umfangreichere UX-Überarbeitung ist hier noch nicht umgesetzt. Die Originaldateien jedes Ausgangsstands sind über SHA-256 dokumentiert; Darstellungsergänzungen für den öffentlichen Vergleich sind in revision.json genannt. Das ungeklärte Galeriebild ist in allen öffentlichen Ständen ausgeschlossen.

Historische Ordner unter revisionen/ und ihre gemeinsam verwendeten Assets werden durch scripts/verify-review-revisions.mjs gegen revision-locks.json geprüft. Frühere Stände nicht überschreiben. Neue Änderungen erhalten einen weiteren Ordner und neue Asset-Dateinamen. Die Auswahl behält die betrachtete Seite bei, auch bei den früheren Namen „Das Rudel“ und „Aktuelles“. Studio-Speicher ist je Revision getrennt. Versionen anzeigen ändert keine echten CMS-Inhalte.
