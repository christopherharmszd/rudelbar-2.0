> Neuer Stand: Funktionsumbau am 4. November 2026 veröffentlicht.
> Maßgeblich: [CURRENT.md](CURRENT.md). Diese Pausennotizen sind historisch.

> Wieder aufgenommen am 4. November 2026. Die folgenden Pausennotizen sind historisch.
> Aktuelle Ergebnisse stehen am Ende von docs/resume-2026-11-03.md.
> Neuester Pausenstand davor: 3. November 2026, 19:11 Uhr (Europe/Berlin).
> Nach „mach weiter“ wurde die Entwicklung wieder aufgenommen und nun auf
> erneuten Nutzerwunsch wegen Zuklappen des Laptops wieder gesichert pausiert.
> Maßgeblich ist der aktuelle HEAD des unten genannten Arbeitszweigs.
> Zusätzliche Ergebnisse: docs/qa-2026-11-03-resumed.md.

# Gesicherter Pausenstand

3. November 2026, morgens. Der Nutzer bittet wegen seiner Reise um eine
Unterbrechung mit späterer Wiederaufnahme. Die Entwicklung ist deshalb bewusst
pausiert. Nicht als abgeschlossen melden und ohne Wiederaufnahme nicht weiterarbeiten.

## Gesichert

- Repository: https://github.com/christopherharmszd/rudelbar-2.0
- Arbeitszweig: `codex/rudelbar-wall-wip-2026-11-03`
- Geprüfter Code-Zwischenstand: `0f534c3425b1240f6dbcbdbf8d9c9c94aaa487f4`
- Dieser Code liegt lokal und identisch auf GitHub. Diese Pausennotiz wird ebenfalls gesichert.
- Ausführliche Fortsetzung: [resume-2026-11-03.md](resume-2026-11-03.md).
- Der freigegebene Gesamtplan liegt zusätzlich im übergeordneten Ausgabeordner des Chats.

Die Fortsetzung hängt nicht von ungespeicherten Editoränderungen ab. Flüchtige
lokale Prüfdaten, Testserver und Browser-Tabs müssen keinen Laptop-Neustart
überleben. Die isolierten Prüfumgebungen werden bei Bedarf neu gestartet.
Geschützte Sicherungen und lokale Zugangsdaten gehören nicht ins öffentliche Git.

## Tatsächlich geprüft

- 200 automatische Tests erfolgreich.
- `admin/tests/encounters-runtime.mjs`: echter Worker-RPC-/D1-Laufzeittest erfolgreich;
  gegenseitiges Interesse, private Nachrichten, gleichnamige getrennte Profile,
  sichere einmalige Kontaktlinks, Kontaktcookie, geschlossener Abend und Widerruf.
- Mailversand ausschließlich mit isoliertem Fake-Mailer geprüft. Keine echte E-Mail verschickt.
- `0014_encounters.sql` auf wiederhergestellter geschützter Sicherung nach
  0011/0012/0013 zweimal angewendet: alle 80 vorher vorhandenen Tabellen
  unverändert; Integritätsprüfung korrekt, keine Fremdschlüsselfehler.
- Diese Sicherung stammt vom 2. November vor der damaligen Gesprächsumstellung.
  Sie ist keine frische Sicherung unmittelbar vor einer Veröffentlichung.

## Online-Stand und Abgrenzung

Abschnitte 1–4 und der Kern von 5 sind online. Wall, Gewinnaktionen und
Begegnungen/Kontakte wurden lokal wesentlich erweitert und getestet, sind aber
noch nicht vollständig abgenommen oder veröffentlicht. Die Migrationen
0012–0014 sind noch nicht auf der echten Datenbank angewendet.

Online bleibt der vorher veröffentlichte Stand `772ae1c90b083127a5dc9e31d45b891b6bf9c73a`.
Es wurden für die neuen Module keine realen Gäste, Profile, Abende, Gewinnaktionen
oder öffentlichen Bilder angelegt. Neue Module sind standardmäßig ausgeschaltet.
Der Zugang Redaktion und die unabhängige Notfallredaktion bleiben erhalten.

## Bei Wiederaufnahme

1. Aktuellen Zweig, sauberen Arbeitsbaum und GitHub-Gleichstand prüfen. Diese
   Datei und die ausführliche Wiederaufnahmenotiz lesen. Fertige Grundlagen
   weiterverwenden und nicht erneut bauen.
2. Die isolierte Vorschau mit aktuellem Backend neu starten. Die älteren lokalen
   Server auf 8796–8817 enthalten teilweise veralteten Code und sind kein Nachweis
   des aktuellen Stands. `.qa` bleibt lokal und privat.
3. Neue Oberflächen vollständig im Browser prüfen: Backstage-Assistent,
   Live-Begegnungsrunden, Gästeprofil/Vorschau, private Fotos, begrenzte Vorschläge,
   gegenseitiges Hallo, Gespräch, Pause, Melden/Sperren, Kontaktfortsetzung und
   Wiederaufnahme. Mobile Größe, Formularerhalt, Fehler-/Wartezustände und Tastatur
   besonders prüfen. Der Browser reagierte zuletzt wieder auf Dokumentationsaufrufe;
   eine frühere Navigation hatte allerdings mehrere Stunden blockiert.
4. Offene Wall-Abnahme (Galerie/Archiv/1–100 Beiträge/Kompositionen) und
   Gewinnaktions-Oberflächen abschließen. Funktionskatalog und Stationsverknüpfungen
   der neuen Module erst nach vollständiger Integration freischalten.
5. Abschnitt 8 vollständig abnehmen; Berichtsdefinitionen, Kleingruppenschutz,
   Fristen, Rollen und Ereignisse modulübergreifend prüfen. Danach Abschnitt 9:
   Gesamtabnahme und abschließende allgemeine Gäste-UX.
6. Vor Veröffentlichung neue Betriebssicherung, aktuellen Datenbestand und exakte
   Rudelbar-Zielressourcen prüfen; additive Migration nochmals mit diesem Stand
   proben. CMS zuerst, dann Gäste-Worker; tatsächlichen Online-Stand separat prüfen.
   Die Aktivierung eines Angebots für echte Gäste bleibt eine bewusste
   Bedienhandlung mit vollständigen Regeln und Zweck-/Fristangaben.

Der Nutzer hat den gesamten Tätigkeitsrahmen und Abschnitt 8 ausdrücklich
freigegeben. Keine erneuten Routinefreigaben für lokale Tests, Dateien, Commit,
GitHub-Sicherung oder die vorgesehenen Rudelbar-Veröffentlichungen erfragen.
Echte Anbieter-/Systemdialoge lassen sich dadurch nicht ersetzen. Keine fremden
Elbmafia-Ressourcen ändern und keine tatsächlichen Nachrichten als Test versenden.
