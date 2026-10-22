# Zugriffsprüfung am 22. Oktober 2026

Ziel: bestehende Website und Redaktion in dieser Arbeitsumgebung weiter betreuen können. Keine Veröffentlichung, Inhaltsänderung, Migration oder Passwortänderung beauftragt oder ausgeführt.

## Aktueller lokaler Stand

- Frischer Checkout von `christopherharmszd/rudelbar-2.0`, Ausgangscommit `9d4bd06fd0186ea3fdd47e36543c7e9da6eabb6e`.
- Lokaler Dokumentationsbranch `docs/zugriffspruefung-2026-10-22`; nicht gepusht, kein Pull Request erstellt.
- Anwendungscode und Lockdateien unverändert; einzige Dokumentationsänderung ist dieser Prüfbericht.
- Node.js 24.19.0, Git 2.53.0 aus der gebündelten Laufzeit. Die bestehende CI verwendet Node 22; die heutige lokale Prüfung erfolgte mit Node 24.
- Website-Abhängigkeiten mit `npm ci` aus der bestehenden Lockdatei installiert. npm wurde vorübergehend über den gebündelten Paketmanager bereitgestellt.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Website frisch mit Staging-Konfiguration gebaut | Erfolgreich, `app/dist/client` |
| Website-Tests nach diesem Build | 5/5 erfolgreich |
| Produktionsbuild frisch erstellt | Erfolgreich, `app/dist/production`; ausschließlich lokal |
| Website-Tests im Produktionsmodus | 5/5 erfolgreich |
| Worker-Tests direkt mit Node ausgeführt | 3/3 erfolgreich |
| Git-Differenz der bestehenden versionierten Dateien | Leer nach Build und Tests |
| GitHub-Push als Trockenlauf | Fehlgeschlagen: kein verfügbarer Benutzername für HTTPS; keine Remote-Änderung |

Die Worker-Tests simulieren Sanity vollständig und verwenden ausschließlich Testzugangsdaten. Erwartete Ablehnungen unzulässiger Archivaktionen erscheinen in der Ausgabe; die Tests bestehen. Die vollständigen Wrangler-Abhängigkeiten wurden nicht installiert; ein lokaler Worker-Server oder CLI-Deploy wurde nicht geprüft.

## Lesend bestätigte Dienstzugriffe

- GitHub: beide Repositories im angemeldeten Browser erreichbar. Standardbranch jeweils `main`; Quellcodecommit wie oben, Produktionscommit `9f33650ee6caae5329ee8cab96c34d77b5fc3a3a` (Bestandsprüfung dieses Chats). Browser zeigt Eigentümerzugriff; ein tatsächlicher Schreibvorgang wurde nicht durchgeführt.
- Sanity: angemeldeter Benutzer mit Rolle Administrator im Projekt `uywmld5e`. Datasets `staging` und `production` vorhanden, beide öffentlich lesbar. Keine Daten verändert und keine Tokens ausgelesen oder erstellt.
- Cloudflare: nach Anmeldung das Konto aus den Repository-Konfigurationen erreicht; `rudelbar-cms` und `rudelbar-cms-staging` vorhanden.
- Produktionsworker: aktive Version in der Dashboard-Kurzform `e8fffdea`, Status Ready, 100 Prozent Traffic.
- Stagingworker: aktive Version in der Dashboard-Kurzform `8381dd7c`, Status Ready, 100 Prozent Traffic. Die Cloudflare-Umgebungsbezeichnung Production innerhalb dieses Workers bezeichnet dessen aktive Umgebung, nicht das Sanity-Dataset production.
- Staging-Laufzeitkonfiguration im Dashboard: `SANITY_PROJECT_ID=uywmld5e`, `SANITY_DATASET=staging`, Login-Limiter-Namespace `7321821`. Alle drei erwarteten Secrets sind als verschlüsselte Einträge vorhanden; ihre Werte wurden nicht ausgelesen.
- Die Worker wurden laut Dashboard manuell mit Wrangler veröffentlicht. Eine Zuordnung der aktiven Versionen zum aktuellen Git-Commit wurde nicht nachgewiesen.
- Produktionsredaktion: Anmeldung durch den Benutzer erfolgreich; die Inhaltslisten sind lesbar.
- Live-Website `https://rudelbar.de/` erfolgreich geladen.

## Aktueller Produktionsinhalt laut Redaktion

- Termine: ein aktiver, veröffentlichter Termin „Premiere in Scharnebeck“, Datum 2. Oktober 2026; null archiviert. Die Liste zeigt VERÖFFENTLICHT und keinen Hinweis auf offene Änderungen.
- Team: fünf veröffentlichte Profile, null Entwürfe / Änderungen.
- Aktuelles: ein aktiver, veröffentlichter Beitrag „Scharnebeck 2026 – Ein Abend, der verbindet!“, Datum 8. Oktober 2026; null archiviert.
- Der Beitrag erscheint auf der Live-Startseite. Für den nächsten Termin erscheint der Leerzustand; der vorhandene Termin liegt in der Vergangenheit.

Diese Beobachtungen ersetzen die historischen Bestandszahlen des Handbuchs für den Prüfzeitpunkt. Kein vollständiger Datenexport oder Backup-Nachweis.

## Nachprüfung und verbleibende Schritte

- Nach Installation der Apple Command Line Tools am selben Tag: aktiver Entwicklerpfad `/Library/Developer/CommandLineTools`, System-Git `/usr/bin/git` Version 2.50.1 (Apple Git-155), Apple clang 21.0.0. Alle Versions-/Pfadprüfungen erfolgreich. Auch der Push-Trockenlauf mit `/usr/bin/git` und der zuvor eingerichteten lokalen GitHub-Anmeldehilfe ist erfolgreich (Exitcode 0); kein Upload und kein Remote-Branch angelegt. Die frühere Einschränkung des System-Git ist damit behoben.
- Nachprüfung am selben Tag: GitHub Desktop ist unter `/Applications/GitHub Desktop.app` installiert und als `christopherharmszd` angemeldet. Beide Rudelbar-Repositories stehen in der Kontoliste. Der bestehende lokale Quellcode-Checkout wurde in Desktop hinzugefügt; `Fetch origin` endete mit `fetch complete` ohne Anmeldefehler. Desktop bietet für den lokalen Dokumentationsbranch `Publish branch` an; dieser wurde nicht veröffentlicht.
- GitHub Desktop ist damit eine vorhandene Arbeitsmöglichkeit für spätere Uploads. Der zunächst getestete Desktop-Anmeldehelfer erwartet die Desktop-interne Verbindung (`DESKTOP_PORT`); dieser direkte Versuch aus dem Terminal scheiterte. Der Terminalzugang wurde anschließend wie unten beschrieben mit Git Credential Manager erfolgreich eingerichtet. Keine Zugangsdaten ausgelesen und keine globale Git-Konfiguration geändert.
- Branch-Push und Pull Request erst bei einem konkreten Änderungsauftrag tatsächlich durchführen.
- Terminal-Anmeldung auf ausdrücklichen Auftrag erfolgreich eingerichtet: Git Credential Manager 2.9.0 aus GitHub Desktop wird nur in diesem lokalen Checkout als HTTPS-Anmeldehilfe verwendet. Die Anmeldung läuft über GitHubs Gerätefreigabe und den macOS-Schlüsselbund; keine Zugangswerte in Git oder Projektdateien. Der Benutzer hat die angezeigten Rechte für öffentliche/private Repositories, Gists und Workflows ausdrücklich genehmigt. GitHub meldete die erfolgreiche Geräteverbindung; der Anmeldeprozess endete mit Exitcode 0.
- Anschließender Terminaltest mit dem gebündelten Git und der lokalen Anmeldekonfiguration: `git push --dry-run origin HEAD:refs/heads/docs/zugriffspruefung-2026-10-22` erfolgreich (Exitcode 0). GitHub akzeptiert den Schreibzugang und zeigt den möglichen neuen Branch an. Wegen `--dry-run` wurde kein Remote-Branch angelegt und nichts hochgeladen. Tatsächlicher Push/PR bleibt einem konkreten Änderungsauftrag vorbehalten. Die lokale Anmeldekonfiguration gilt nicht automatisch für weitere Checkouts.
- Cloudflare-CLI-Authentifizierung und Deploy-Berechtigung aus dieser lokalen Umgebung nicht geprüft. Browserzugriff ist bestätigt; das ist kein Nachweis eines funktionierenden CLI-Deploys.
- Keine Secrets, DNS-Einstellungen, Dienste, Datasets oder CMS-Inhalte geändert. Kein Testformular abgesendet. Keine Veröffentlichung durchgeführt.
