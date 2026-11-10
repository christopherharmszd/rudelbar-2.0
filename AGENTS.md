# Rudelbar: Arbeitsgrundlage

## Aktuellen Stand zuerst prüfen

Vor Änderungen `docs/CURRENT.md`, `README.md` und bei Veröffentlichungen `docs/production-release.md` lesen. Vorhandene Session-Anweisungen und Benutzeraufträge behalten Vorrang.

Bearbeitbare Quelle ist `christopherharmszd/rudelbar-2.0/main`. Der aktuelle lokale Checkout ist `/Users/christopher.harms/Documents/GitHub/rudelbar-2.0`. `rudelbar-pages` ist die Produktionssteuerung, kein zweiter Website-Quellcode.

Vor einem Commit oder Release entfernten aktuellen Branch-Stand prüfen. Ein alter lokaler `origin/main`-Verweis reicht nicht. Produktionsquelle aus dem tatsächlichen `https://rudelbar.de/site-manifest.json` lesen und mit der vorgesehenen Quelle abgleichen. Bei Worker-Arbeit aktive Cloudflare-Version und Bindungen prüfen; keine alte lokale Arbeitskopie ungeprüft veröffentlichen.

## Verbindlicher Maßstab für Gestaltung und Kommunikation

GTM-Guide, Brand Guide und freigegebene Website-Textvorlage sind vor jeder gestalterischen oder sprachlichen Überarbeitung abzugleichen. Maßgeblich sind die Originaldokumente sowie spätere ausdrückliche Entscheidungen des Inhabers. Aktuelle Vorlagen: Rudelbar Brand Guide V1.4 und Website-Textvorlage V1.0 vom 8. November 2026 sowie Website-Nachtrag 2 V1.1 vom 9. November 2026. Der Nachtrag definiert die benannten Änderungen gegenüber Freigabeentwurf 09; alles Übrige bleibt erhalten. Fehlt eine Vorlage im Arbeitskontext, zuerst beschaffen.

Für Gäste-App, Backstage und Live gilt seit dem Auftrag vom 10. November der vom Inhaber gelieferte Brand Guide V1.9 vom 9. November 2026. Der Inhaber erlaubt begründete App-Abweichungen und ausdrücklich zusätzliche Fehler- und Warnfarben; diese Entscheidungen sind in `docs/app-brand-2026-11-10.md` festgehalten. Die Website-Freigabevorschau ist davon unabhängig.

Nachentscheidung vom 9. November 2026 für Freigabeentwurf 11: Fragen auf Desktop und mobil im Hauptmenü, FAQ-Suche und neu geordneter Footer mit bestehenden Inhalten. Diese ausdrückliche Entscheidung ersetzt die Desktop-Sechs-Punkte-Regel des Nachtrags 2. Sie ändert keine weiteren Seiten oder freigegebenen Texte.

Bestehenden freigegebenen Wortlaut für denselben Zweck übernehmen. Neue Überschriften, Claims und erklärende Zusätze nicht nebenbei aus allgemeinen UX-Annahmen ableiten. Eine Kürzung berechtigt nicht zur Änderung der inhaltlichen Gewichtung. Abweichungen vom Guide ausdrücklich benennen und vor ihrer Umsetzung abstimmen; bereits ausdrücklich beschlossene Ausnahmen erhalten.

Prüfungen müssen Wortlaut, Markenwirkung und visuelle Gewichtung gegen die Vorgaben kontrollieren. Funktionierende Technik, weniger Scrollen und fehlende Überbreite allein rechtfertigen keine positive gestalterische Freigabe.

## Aktive Bereiche

- `app/`: öffentliche Website.
- `admin/`: aktuelles Backstage/Backend.
- `event-app/`: Gäste-Oberfläche.
- `shared/`: gemeinsame Regeln.
- `fix/legacy-cms-audit-2026-11-05`: eigenständiger, bewusst beibehaltener Notfall-Worker. Dessen Konfiguration nicht mit modernem Code vermischen.
- `rudelbar-gtm-feedback`: eigenständige Anwendung mit geschützten Rückmeldungen; ihre Daten und Quellen nicht ungeprüft in dieses öffentliche Repository aufnehmen.

Die Worker-Namen `rudelbar-cms-staging` und `rudelbar-app-staging` sind historisch. Die Dienste werden tatsächlich genutzt. Website-Inhalte verwenden `production`, interne App-Daten `staging`. Ein Code-Release kopiert keine Inhalte zwischen Datasets.

## Entwicklung und Betrieb

Nur eine aktuelle bearbeitbare Arbeitsgrundlage verwenden. Abgeschlossene Arbeitsbranches zusammenführen und entfernen; notwendige isolierte Arbeitskopien nach gesicherter Übernahme aufräumen. Konzepte, Handbücher und frühere Prüfbelege nicht als aktuelle Anwendungsversion behandeln.

Bestehende Konten, Passwörter, Geheimnisse, Datenbanken, Medien, Rechte und Mail-/DNS-Einstellungen erhalten. Geheimnisse und geschützte SQL-/Wiederherstellungspakete gehören nicht ins öffentliche Git. Historische Initialisierung oder Datenbefüllung nicht über echte Bestände ausführen.

Website-Bau und Worker-Deployment sind getrennt. Produktion verwendet einen fest freigegebenen Quellcode-SHA im Workflow von `rudelbar-pages`. Innerhalb des erteilten Auftrags arbeiten; keine zusätzlichen Freigabeschleifen für bereits autorisierte reversible Arbeiten einführen. Produktion veröffentlichen, wenn es zum Benutzerauftrag gehört.

Der direkte GitHub-Build-Trigger und sein zusätzlicher PAT wurden entfernt. Vorhandene Zeitpläne erhalten; keinen neuen Build-Schlüssel für diesen Ablauf anlegen.

## Prüfen und dokumentieren

Für Website-Änderungen in `app/` die betroffenen Build-Ziele bauen und testen. Für CMS-Änderungen in `admin/` `npm test` und passende isolierte Bedienprüfungen verwenden. Reine Dokumentation erfordert keine erneuten unveränderten Anwendungstests.

Live-Erfolg erst nach erfolgreichem Deployment und tatsächlicher Ausgabeprüfung melden. Lokalen Commit, Git-Push, Deployment und sichtbare Website unterscheiden. Web3Forms-Anfragen versenden echte E-Mails.

Nach relevanten Änderungen `docs/CURRENT.md` und den Betriebsablauf konsistent halten. Google Search Console und echte iPhone-/Android-Abnahme bleiben offen, bis sie tatsächlich erledigt sind. Historische Warnungen und ältere Datumsberichte nicht als aktuellen Betriebsstand ausgeben.
