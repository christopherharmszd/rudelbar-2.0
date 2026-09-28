# Rudelbar Redaktion

Eigenständige Verwaltungsoberfläche für Termine und Teamprofile. Die öffentliche Rudelbar-Website wird durch dieses Verzeichnis nicht verändert.

Termine und Teamprofile erscheinen zunächst als kompakte Listen. Details und Eingabefelder öffnen sich erst nach Auswahl eines Eintrags in einem Dialog. Auf breiten Bildschirmen stehen die Felder nebeneinander; auf dem Handy ist der Dialog bildschirmfüllend und die Aktionen bleiben unten erreichbar. Der Dialog lässt sich über das Schließen-Symbol oder die Escape-Taste verlassen.

## Lokal ansehen

Im Repository `node admin/server.mjs` starten und `http://127.0.0.1:8787` öffnen. Ohne Sanity-Konfiguration läuft eine **schreibgeschützte Vorschau** mit dem im Website-Code vorhandenen Termin und fünf Teamprofilen. Es gibt keine Anmeldung und keine Speicherung in diesem Modus; der Server bindet dafür ausschließlich an `127.0.0.1`.

Das Sanity-Projekt `Rudelbar 2.0` liegt unter dem Konto `info@rudelbar.de` und hat die Projektkennung `uywmld5e`. Das öffentliche Dataset `staging` ist für den Test eingerichtet; das automatisch erzeugte `production`-Dataset bleibt leer. Zwei Termine und fünf Teamprofile samt Bildern wurden aus dem ursprünglichen Testprojekt in `staging` übertragen und veröffentlicht. Die lokale Website in `app/` liest diese Inhalte direkt aus Sanity.

## Staging jetzt testen

Auf diesem Rechner liegen die lokalen, von Git ausgeschlossenen Konfigurationsdateien `admin/.env.local` und `app/.env.local` bereits vor. Zwei Terminals im Repository öffnen:

```sh
node --env-file=admin/.env.local admin/server.mjs
cd app && npm run dev -- --host 127.0.0.1 --port 8790
```

Dann die [Redaktion](http://127.0.0.1:8787/) und die [Test-Website](http://127.0.0.1:8790/) öffnen. Der lokale Zugang lautet `redaktion@rudelbar.local`; das Passwort wurde separat mitgeteilt und ist nur als Hash gespeichert. Einen Termin oder ein Teammitglied öffnen, den Entwurf speichern und danach ausdrücklich „Veröffentlichen“ wählen. Die Test-Website danach neu laden. Termine stehen auf der [Terminseite](http://127.0.0.1:8790/#/termine), der nächste auch auf der Startseite; Teamprofile stehen unter [Das Rudel](http://127.0.0.1:8790/#/das-rudel).

Für einen Termin im Formular Ort und Adresse eingeben. Daraus entsteht automatisch ein Google-Maps-Suchlink. Mit „Karte prüfen“ lässt sich das Ergebnis vor der Veröffentlichung kontrollieren. Falls Google nicht den richtigen Ort trifft, einen genauen Link aus Google Maps in das Linkfeld einfügen; dieser bleibt auch bei Änderungen an Ort und Adresse erhalten. „Aus Adresse neu erstellen“ ersetzt einen solchen Link wieder durch die automatische Suche. Erst mit Entwurf speichern und Veröffentlichen erscheint der Link auf der Test-Website. Maps URLs benötigen keinen API-Schlüssel und verursachen keine API-Kosten.

Der API-Token hat auf Wunsch kein Ablaufdatum. Er liegt nur in `admin/.env.local` und gehört weder in Git noch in den Website-Code. Für eine öffentlich erreichbare Redaktion den Redaktionszugang mit einem neuen starken Passwort und HTTPS absichern.

## Für den echten Schreibbetrieb

Einen **Editor-API-Token** für dieses Projekt erzeugen; keinen persönlichen Administrator-Token verwenden. Die Konfiguration aus `admin/.env.example` nach `admin/.env.local` übernehmen, die geheimen Werte ergänzen und lokal mit `node --env-file=admin/.env.local admin/server.mjs` starten. `admin/.env.local` ist von Git ausgeschlossen. Für einen späteren Node-Host dieselben Werte als geschützte Umgebungsvariablen setzen:

| Variable | Bedeutung |
| --- | --- |
| `SANITY_PROJECT_ID` | Projektkennung |
| `SANITY_DATASET` | Name des Datasets, zum Beispiel `staging` |
| `SANITY_EDITOR_TOKEN` | Technischer Schreibzugang, nur auf dem Server |
| `RUDELBAR_SESSION_SECRET` | Zufälliger Schlüssel mit mindestens 32 Zeichen |
| `RUDELBAR_USERS_JSON` | JSON-Liste von Redaktionszugängen |
| `NODE_ENV` | Für HTTPS-Betrieb `production` setzen; Session-Cookies erhalten dann `Secure` |
| `HOST`, `PORT` | Adresse und Port des Node-Dienstes; Standard `127.0.0.1:8787` |

Ein Passwort-Hash lässt sich lokal mit `node admin/hash-password.mjs` erstellen. Das Passwort wird im Terminal verborgen eingegeben. Beispiel für die Struktur der Nutzerliste, **ohne echte Zugangsdaten**:

```json
[{"email":"redaktion@example.invalid","passwordHash":"SALT:HASH","role":"editor"},{"email":"freigabe@example.invalid","passwordHash":"SALT:HASH","role":"publisher"}]
```

`editor` darf Entwürfe schreiben und Bilder hochladen. `publisher` darf zusätzlich veröffentlichen und veröffentlichte Inhalte zurückziehen. Diese Rechte werden im Server geprüft. Der Browser erhält nie den Sanity-Token. Die App braucht einen Node-Host mit HTTPS; GitHub Pages allein kann den schreibenden Dienst nicht ausführen.

## Bestehende Inhalte übernehmen

`node admin/import-existing.mjs` kann den ursprünglichen Scharnebeck-Termin und die fünf Teamprofile samt Bildern **als Entwürfe** in ein leeres Dataset übertragen. Das neue `staging` enthält bereits die aus dem früheren Projekt übernommenen veröffentlichten Inhalte; das Skript dort nicht erneut ausführen. Das frühere Projekt `h34z7ud0` bleibt vorerst als Rückfallmöglichkeit bestehen.

## Reihenfolge und Website-Anbindung

Bei Terminen und Teamprofilen bestimmt das Feld „Reihenfolge“ die Anordnung auf der jeweiligen Übersichtsseite. Eine Änderung wird erst nach Speichern des Entwurfs und erneuter Veröffentlichung öffentlich sichtbar. Auf der Startseite erscheint unabhängig davon automatisch der nächste veröffentlichte Termin nach Datum. Vergangene Termine verschwinden aus den Ansichten für kommende Termine.

Die lokale Website ist über `app/.env.local` mit `staging` verbunden. Der GitHub-Pages-Workflow in `.github/workflows/pages.yml` setzt `VITE_SANITY_PROJECT_ID=uywmld5e` und `VITE_SANITY_DATASET=staging` für die öffentliche [Staging-Website](https://christopherharmszd.github.io/rudelbar-2.0/). Das Dataset ist öffentlich lesbar; die GitHub-Pages-Origin ist in Sanity freigegeben. Ohne diese beiden Werte zeigt die Website weiterhin die bisherigen Beispieldaten. Der Schreib-Token bleibt ausschließlich beim Redaktionsserver. Der Produktionswechsel zu `rudelbar.de` ist noch offen.

## Betriebshinweise

- Den Schreibdienst nur über HTTPS erreichbar machen und Token sowie Nutzerliste im Hosting als Geheimnisse hinterlegen.
- Für jede Website ein eigenes Sanity-Projekt und eigene technische Zugänge verwenden.
- Regelmäßig Datensicherung, Tokenwechsel und Zuständigkeiten für Redaktionszugänge festlegen.
- Die App verwaltet derzeit nur Termine und Teamprofile. Ein allgemeiner Seiteneditor ist nicht enthalten.
