# Ressourcenschonender App-Betrieb

Arbeitsauftrag vom 11. November 2026. Entwicklungsstand vom 12. November: lokal umgesetzt und geprüft, noch nicht auf den laufenden Workern veröffentlicht. Keine echten Datenbankmigrationen oder Tarifbuchungen durchgeführt.

## Ziel und Grenzen

Der Inhaber genehmigt den Architekturumbau. Kostenpflichtige Tarife sind möglich, ersetzen aber keine effiziente Implementierung. Nachrichten dürfen ungefähr fünf Sekunden benötigen. Website, veröffentlichte UX, bestehende Inhalte, Identitäten, Rechte, private Eventlinks und Medien bleiben erhalten. Keine automatische Tarifbuchung.

Die vorhandene Architektur vervielfacht Abfragen: ein Gäste-Konfigurationsabruf verursachte im isolierten Zählversuch neun Sanity-Operationen, ein Team-Kontext acht. Mehrere unabhängige Browserintervalle rufen diese Wege wiederholt auf. Die Sanity-Logs vom 4.–10. November bestätigen wiederholte Abfragen derselben App-Stammdaten; der Export enthält den heutigen Spitzenverbrauch nicht. Sanity meldete 265.873 API-Abfragen bei 250.000 enthaltenen, 0 API-CDN-Abfragen, 32,4 MB Assets und etwa 1,5 GB Bandbreite. Der Cloudflare-Free-Zugang meldete laut Inhaber 80 % von 100.000 Tagesrequests; die aktuelle anwendungsspezifische Verteilung wurde noch nicht nachgewiesen.

## Zuständigkeiten

- Sanity bleibt Redaktionsquelle. Ein normaler Gast-, Live- oder Kontositzungsabruf darf keine Sanity-Abfrage benötigen.
- D1 hält versionierte Abendfassungen, benötigte Betriebsmetadaten sowie eine explizit synchronisierte Projektion der Personen und Partner. Laufende Daten und Rechte bleiben in D1.
- R2 hält private Gäste-Fotos und Archive. Keine neue öffentliche Ablage.
- Ein hibernierender Änderungsverteiler pro aktivem Abend bündelt den Änderungscheck. Er überträgt nur Änderungskennungen, keine Gesprächsinhalte, Namen, Fotos oder Freigaben. Abruf und Mutation bleiben ausdrücklich authentifiziert und autorisiert.

## Migration der Laufzeitdaten

Neue additive D1-Tabellen verändern keine bestehenden Inhalts-/Kontotabellen. Eine einmalige, vollständige Synchronisierung liest die bestehenden Sanity-Objekte und ergänzt die bereits veröffentlichten D1-Fassungen. Keine Datensynthese, keine privaten Abende als öffentlich behandeln, keine Accounts aufgrund fehlender Projektion freischalten. Unvollständige Projektion führt zu einem erklärten Fehler und nicht zu einem stillen Wechsel zur Live-Sanity-API.

Redaktionelle Personen-/Partner-/Abendänderungen schreiben die Projektion ausdrücklich mit. Sicherheitsrelevante Änderungen müssen bei unterbrochener Synchronisierung geschlossen bleiben. Rollen, Sessions und Sperren werden weiterhin aktuell aus D1 geprüft; kein langfristiger Authentifizierungscache. Veröffentlichung einer neuen Fassung und der zugehörigen Laufzeitmetadaten erfolgt atomar. Vorhandene unveränderliche Freigabefassungen werden nicht überschrieben.

## Aktualisierung

- Eine Verbindung pro geöffneter Gäste-/Team-App bündelt Änderungsmeldungen.
- Der Verteiler prüft nur bei verbundenen Clients und höchstens im Fünfsekundentakt die erforderlichen D1-Änderungskennungen. Ohne verbundene Clients schläft er.
- Clients laden nur betroffene Daten nach. Unveränderte Abendfassungen werden nicht regelmäßig vollständig geladen.
- Während Bearbeitung/Upload werden Formularzustände erhalten. Nach Rückkehr/Verbindungswechsel erfolgt ein begrenzter Abgleich.
- Bei Verbindungsfehlern: begrenzte Wiederverbindung mit Wartezeit, ein gemeinsamer langsamer Rückfall und keine parallelen Retry-Schleifen. Versteckte Ansichten erzeugen keine regulären Hintergrundabrufe.
- Vorhandenes Web Push für geschlossene Apps bleibt erhalten. Die Browserverbindung ersetzt keine Betriebssystemmitteilung.

## Abnahme

1. Normaler Gäste-, Team- und persönlicher Sitzungsbetrieb verursacht nach Synchronisierung null Sanity-Lesezugriffe, auch bei simuliertem Sanity-Ausfall.
2. Private Eventcodes, Rollen, Personenlöschung/-archivierung, Sessionsperre, Eventschließung und Postfachgrenzen bleiben wirksam.
3. Ein unveränderter, verbundener Client erzeugt während des Messfensters keine periodischen HTTP-Datenabrufe.
4. Mehrere Clients eines Abends vervielfachen nicht die serverseitigen Kontrollabfragen. Änderungen werden zusammengefasst; Abmeldung und letzte geschlossene Verbindung beenden die Überwachung.
5. Nachrichten-/Moderations-/Konfigurationsänderungen kommen im normalen Betrieb ungefähr innerhalb von fünf Sekunden an. Wiederverbindung holt verpasste Änderungen nach, ohne Aktionen erneut zu senden.
6. 150 simulierte Gäste, 1.500 simulierte Bildvorgänge und mehrere Teamstationen werden isoliert geprüft. Request-, D1-Zeilen-, R2- und Verbindungszahlen werden getrennt ausgewiesen. Keine echte Mail-/Push-Flut und kein Lasttest gegen die knappen Anbieter-Kontingente.
7. Bestehende Tests und reale Dateiauslieferung/Bindungen werden geprüft. Lokale Messung und echte Geräteabnahme klar unterscheiden.

## Betrieb und verbleibende Anbietergrenzen

Die aktuelle Sanity-Sperre verschwindet nicht durch Codeänderungen. Falls die einmalige Synchronisierung durch das Kontingent verhindert wird, ist eine Wiederfreigabe erforderlich. Der bereits laufende Betrieb kann bis zum Release weiter Tagesrequests erzeugen. Workers-Free-, CPU-, D1-, R2- und Durable-Object-Grenzen werden getrennt betrachtet; keine erneute Kapazitätszusage allein anhand der Gästezahl.

## Schutz vor unkontrollierten Anbieterabfragen

`RUDELBAR_SANITY_BUDGET=1` setzt vor **jedem tatsächlichen Sanity-Aufruf dieses Backends** ein atomar geprüftes D1-Budget durch. Vorgaben: 1.000 Versuche pro UTC-Tag, 20.000 pro UTC-Kalendermonat. Beide Fenster müssen gleichzeitig frei sein; parallele Worker können die Grenze nicht überziehen. Auch fehlgeschlagene Versuche werden konservativ gezählt. Innerhalb einer Anfrage zusammengefasste identische Lesezugriffe zählen einmal. Bei erschöpftem Budget wird die Anfrage mit einem erklärten Fehler beendet, bevor ein weiterer Sanity-Aufruf startet. Keine automatische Erhöhung, kein wiederholter Netzwerkversuch hinter dem Fehler.

**Das ist kein globales Kostenlimit des Sanity-Kontos.** Öffentliche Website-Abfragen, Website-Builds, Studio, andere Tokens/Dienste und der unabhängige Notfall-Worker sind davon nicht umfasst. Grundgebühren, Speicher und Bandbreite begrenzt es ebenfalls nicht. Die öffentliche Website wurde in diesem Auftrag nicht geändert; ihre bisherigen drei browserseitigen Sanity-Abfragen sind ein gesondert zu prüfender Restpfad. Paid Growth hat dasselbe enthaltene API-Kontingent von 250.000; höhere Nutzung wird nach der veröffentlichten Preisliste berechnet, statt gesperrt zu werden. Deshalb keine Freischaltung als Ersatz für diesen Umbau darstellen.

## Nachgewiesene Prüfungen

| Prüfung | Ergebnis / Grenze |
| --- | --- |
| Automatisierte Backend-/Gasttests | 275 erfolgreich; einschließlich Budgetgrenze bei konkurrierenden Aufrufen und Abbruch vor dem Netzwerkzugriff |
| Cloudflare-Runtime mit echtem D1 und LiveFeed | 150 Verbindungen eines Abends; ein Kontrollabruf pro Intervall, persönliche Markierungen getrennt, Aufwachen nach Hibernation, keine Datenbankchecks ohne verbundene Clients |
| Tatsächliche Worker-Servicekette | Gast-Worker → VisitorContent → LiveFeed/D1: privater Zugang, Herkunftsprüfung, persönlicher Cookie, Redaktion-Login, Anfrage/Antwort und Sitzungswiderruf erfolgreich; null externe Aufrufe |
| Browser-Client mit simulierter Uhr | Zwölf abonnierende Ansichten über eine Verbindung, 30 unveränderte Minuten ohne periodischen Datenabruf; unsichtbare Seite beendet Verbindung und Rückfall; Rückkehr, Netzfehler und Sicherheitsänderung geprüft |
| Lokaler Mengenversuch | 150 Gäste, je zehn Fotoeinreichungen; 1.500 Beiträge, 3.000 private Original-/Vorschauobjekte, 20 Moderationsfreigaben; nur zwei initiale Quellabfragen, danach null Sanity-Zugriffe |
| Grenze des Mengenversuchs | Kleine synthetische Bilddateien, insgesamt 808.500 Bytes; kein Beleg für reale Handy-Bildgrößen, Uploadgeschwindigkeit, Spitzenlast oder Cloudflare-Abrechnung. 31.448 lokale SQL-Statements vor der anschließenden Bootstrap-Bündelung; keine gemessenen Anbieter-Zeilenkosten |
| Bestehender Wall-Runtime-Test | Echter Worker-RPC, D1, private R2-Objekte, Original-/Vorschaubild, Moderation, Rücknahme und geschlossener Abend erfolgreich |
| Kombinierter isolierter Abend | DJ, Karaoke, Hilfe, Spielrunde, Wall, Gewinnaktion, Begegnung, Betreuung, Schließung und Bericht gemeinsam erfolgreich |
| Bau | Backend-Wrangler-Trockenlauf erfolgreich; keine Veröffentlichung ausgelöst |

Keine Last gegen reale Anbieter, keine echten Testbeiträge, E-Mails oder Push-Nachrichten erzeugt. Lokale Prüfungen ersetzen keine reale Geräte- und Online-Abnahme. Alte bereits geöffnete Browser verwenden ihren bisherigen Code bis zum Neuladen.

## Wiederaufnahme und kontrollierte Aktivierung

1. Aktuellen GitHub-Stand, tatsächliche Worker-Versionen/-Bindungen und das öffentliche Website-Manifest erneut prüfen. Aktuell weiterhin Backstage `fd5d3df6-18d5-4a03-b7c0-56db7b79fb05`, Gast `1db431e8-2b4c-47cb-b410-fe4d8ba5c564`, Website-Quelle `c5178a1b099fad1d7baee4013921d891925b1038`.
2. Vor jeder echten Migration eine geschützte D1-Sicherung erstellen. Nur neue additive Migrationen 0016, 0017 und 0018 anwenden. Bestehende Accounts, Sessions, Fassungen und Medien nicht zurücksetzen.
3. Erst bei wieder verfügbarem Sanity-Zugang Backend bereitstellen, dann einmal kontrolliert `POST /api/abend/runtime/synchronize` mit gültiger Redaktion-/Admin-Sitzung und CSRF-Prüfung ausführen. Während der noch unvollständigen Erstübernahme sind persönliche Profilresolver bewusst gesperrt; der bestehende Redaktion-Zugang bleibt der Bootstrap-Weg.
4. `GET /api/abend/runtime/status` zeigt für Administration den vollständigen Projektionsstatus und das eigene Abrufbudget. Keine Quellzugriffe für diese Statusabfrage. `ready=1` und erfolgreiche private/öffentliche Zugriffstests sind Voraussetzung für die vollständige Freigabe. Keine fehlenden Daten aus alten Screenshots oder Testbeständen erfinden.
5. Gast-Worker bereitstellen, tatsächlich ausgelieferte Dateien und APP_FEED/LiveFeed-Bindung prüfen. Bestehende private Links, Rollen, Konten, Bilder, Widerruf und Öffnen/Schließen des echten Testabends ohne neue reale Beiträge verifizieren. Website-Manifest unverändert kontrollieren.
6. Danach reale Geräteabnahme und Messung echter Cloudflare-Anfragen/CPU-/D1-Zeilen-/R2-Werte. Kostenabschätzung auf diese Werte stützen. Sanity-Logs des 11. November nach Verfügbarkeit gesondert auswerten; der bisherige Export endet am 10. November.

Sicherheitsrelevante Schreibvorgänge setzen vor dem Quellschreiben eine Sperrmarkierung. Einzel- und Sammelschreibwege spiegeln bestätigte Änderungen; bei unklarem Netzwerkausgang bleibt die betroffene Identität bzw. Veranstaltung gesperrt. Ein gezieltes erneutes Speichern mit aktuellem Quellstand kann diesen Eintrag auflösen. Nach hart abgebrochener Vollsynchronisierung ist ein verbliebenes `sync_token` operativ zu prüfen und erst nach gesichertem Ende des alten Vorgangs gezielt freizugeben; keine automatische zeitgesteuerte Aufhebung einer unklaren Sperre. Änderungen über das unabhängige Notfall-Backend oder direkt in Sanity benötigen einen ausdrücklichen erneuten Abgleich.

Alle Tests sind im Repository reproduzierbar: `admin/tests/runtime-content.test.mjs`, `live-signals.test.mjs`, `sanity-budget.test.mjs`, `live-feed-runtime.mjs`, `runtime-channel-rpc.mjs`, `runtime-capacity.mjs` und `event-app/tests/live-updates.test.mjs`. Die Runtime-Skripte separat aus `admin/` ausführen; sie verwenden ausschließlich isolierte Bestände.

Änderungsmarkierungen enthalten keine Inhaltskopien und sind kein Archiv. Eine begrenzte stündliche Wartung entfernt Markierungen nach 24 Stunden; Wiederverbindungen holen unabhängig davon immer einen neuen zulässigen Stand. Echte Nachrichten und deren Aufbewahrungsregeln werden dabei nicht verändert.
