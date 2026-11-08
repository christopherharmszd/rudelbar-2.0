# Rudelbar Freigabevorschau · Entwurf 06

Stand: 8. November 2026. Öffentliche Designprüfung, keine freigegebene Produktionswebsite.
URL: https://christopherharmszd.github.io/rudelbar-2.0/freigabe/

Die beschlossenen Änderungen sind in Entwurf 06 umgesetzt: kürzere Startseite mit erhaltener Dorfkarte und frühen Termindaten, eigene Rudelbar-App-Seite mit Early Access, Navigation in der Reihenfolge Für euren Ort → Rudelbar-App → Termine → Rudelgeschichten → Über uns, einheitliche Terminkarten, Presseberichte, Kontaktwahl vor dem Formular, Strom und Frischwasser über Schlauchleitung sowie ein schlanker Footer. Gäste und Orte bleiben gleich wichtig.

## Betrieb und Grenzen

Der Staging-Workflow kopiert diesen Ordner nach dem normalen Website-Bau ausschließlich nach app/dist/client/freigabe. Der Produktions-Build übernimmt ihn nicht. Keine Änderungen an Produktion, DNS, Domains, Workern, Zugangswerten oder Sanity.

Es gibt keine Sanity-Verbindung. Inhalte sind eingefroren, Presseverweise redaktionell für diese Vorschau hinterlegt. Studio und Zustandsauswahl speichern nur im jeweiligen Browser; Formulare versenden nichts. Alle Seiten tragen noindex, nofollow, noarchive. Schriften und Bilder kommen von GitHub Pages; Pressebeiträge werden nur verlinkt, nicht eingebettet.

Die echte CMS-Kurztextpflege und ein Medien-Beitragstyp bleiben vor einer Integration in app/ erforderlich. Stromanschlusstyp, Leistung und Bereitstellung von Kabeln und Schlauch bleiben zu klären. Ein Veranstaltungsfoto für Wakendorf und einheitliche Teamporträts folgen. Das ungeklärte dritte Galeriebild ist ausgeschlossen. Vorhandene Aufnahmen sind als Scharnebeck-Fotos benannt.

## Vergleichsstände

Die obere Leiste bietet feste Links: 02 (historischer lokaler GTM-Prototyp), 03 (historischer lokaler Brand-Guide-Prototyp), 04 (erste öffentliche Freigabe, 9bf6b38), 05 (Versionsvergleich und Early Access, 2093c99), 06 (beschlossene Überarbeitung).
Die Seitenansicht bleibt beim Wechsel erhalten; neue App-Seiten fallen bei älteren Ständen auf die Startseite zurück. Änderungen der gemeinsamen Vergleichssteuerung betreffen nur diese Prüffunktion, keine historischen Inhalte.

Archivordner und gemeinsame Assets werden gegen revision-locks.json geprüft. Frühere Inhaltsstände nicht überschreiben. Neue Motive erhalten neue Dateinamen. Öffentliches Deployment und anschließende neue UX-Prüfung sind vor einer Erfolgsmeldung zu verifizieren.
