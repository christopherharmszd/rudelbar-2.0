# Rudelbar Redaktion

Eigenständige Verwaltungsoberfläche für Termine und Teamprofile. Die öffentliche Rudelbar-Website wird durch dieses Verzeichnis nicht verändert.

Termine und Teamprofile erscheinen zunächst als kompakte Listen. Details und Eingabefelder öffnen sich erst nach Auswahl eines Eintrags in einem Dialog. Auf breiten Bildschirmen stehen die Felder nebeneinander; auf dem Handy ist der Dialog bildschirmfüllend und die Aktionen bleiben unten erreichbar. Der Dialog lässt sich über das Schließen-Symbol oder die Escape-Taste verlassen.

## Lokal ansehen

Im Repository `node admin/server.mjs` starten und `http://127.0.0.1:8787` öffnen. Ohne Sanity-Konfiguration läuft eine **schreibgeschützte Vorschau** mit dem im Website-Code vorhandenen Termin und fünf Teamprofilen. Es gibt keine Anmeldung und keine Speicherung in diesem Modus; der Server bindet dafür ausschließlich an `127.0.0.1`.

Das Sanity-Projekt `Rudelbar 2.0` hat die Projektkennung `h34z7ud0`. Das öffentliche Dataset `staging` ist für die Vorschau angelegt; das automatisch erzeugte `production`-Dataset bleibt zunächst leer. Die bearbeitbare Website in `app/` liest lokal bereits aus `staging`. Dort erscheint bis zur Veröffentlichung des ersten Termins der leere Termin-Platzhalter.

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

`node admin/import-existing.mjs` überträgt den vorhandenen Scharnebeck-Termin und die fünf Teamprofile samt Bildern **als Entwürfe** in ein leeres Dataset. Das Skript bricht ab, wenn bereits Rudelbar-Inhalte vorhanden sind. Es wird bewusst nicht automatisch ausgeführt oder veröffentlicht. Vor einem Einsatz müssen die Daten nochmals auf Aktualität geprüft werden.

## Reihenfolge und Website-Anbindung

Bei Terminen und Teamprofilen bestimmt das Feld „Reihenfolge“ die Anordnung auf der jeweiligen Übersichtsseite. Eine Änderung wird erst nach Speichern des Entwurfs und erneuter Veröffentlichung öffentlich sichtbar. Auf der Startseite erscheint unabhängig davon automatisch der nächste veröffentlichte Termin nach Datum. Vergangene Termine verschwinden aus den Ansichten für kommende Termine.

Die Website ist für veröffentlichte Sanity-Inhalte vorbereitet. Beim Website-Build `VITE_SANITY_PROJECT_ID` und `VITE_SANITY_DATASET` setzen. Das Dataset muss öffentlich lesbar sein und die Website-Domain als CORS-Origin zugelassen werden. Ohne diese beiden Werte zeigt die lokale Website weiterhin die bisherigen Beispieldaten. Der Schreib-Token bleibt ausschließlich beim Redaktionsserver. Ohne eingerichtetes Sanity-Projekt, Zugangsdaten und Website-Build ist die Verbindung noch nicht aktiv. Staging-Hosting und Produktionswechsel sind noch offen.

## Betriebshinweise

- Den Schreibdienst nur über HTTPS erreichbar machen und Token sowie Nutzerliste im Hosting als Geheimnisse hinterlegen.
- Für jede Website ein eigenes Sanity-Projekt und eigene technische Zugänge verwenden.
- Regelmäßig Datensicherung, Tokenwechsel und Zuständigkeiten für Redaktionszugänge festlegen.
- Die App verwaltet derzeit nur Termine und Teamprofile. Ein allgemeiner Seiteneditor ist nicht enthalten.
