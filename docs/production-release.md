# Rudelbar: Veröffentlichung in Produktion

## Getrennte Bereiche

| Bereich | Staging | Produktion |
| --- | --- | --- |
| Website | `christopherharmszd.github.io/rudelbar-2.0` | `rudelbar.de` über `christopherharmszd/rudelbar-pages` |
| Redaktion (Haupteinstieg) | Neues Backstage, Website-Bereich | `rudelbar.de/redaktion` → `rudelbar-cms-staging.christopher-harms.workers.dev/backstage#website` |
| Notfall-Redaktion | Im Backstage unter Website erreichbar | `rudelbar-cms.christopher-harms.workers.dev` |
| Sanity-Dataset | `staging` | `production` |

Der Quellcode für Website und Redaktion liegt in `rudelbar-2.0`. `rudelbar-pages` enthält nur die fertigen statischen Dateien für die Live-Domain. Seit 2. November 2026 verwenden beide Website-Editoren im neuen Worker und die Notfall-Redaktion gemeinsam den Bestand `production`. Die übrigen App-Daten bleiben erhalten; Details stehen in [BACKSTAGE.md](../BACKSTAGE.md). Bei der Umstellung des Haupteinstiegs wurden ausschließlich `redaktion.html` und `redaktion/index.html` im veröffentlichten Repository geändert. Ein vollständiger Website-Neubau ist dafür nicht erforderlich.

## Release vorbereiten

1. Im Quellcode-Repository `app/` und `admin/` testen. `npm run build` und `npm test` in `app/` prüfen Staging. `npm run build:production` und `npm run test:production` bauen und prüfen Produktion. `npm test` in `admin/` prüft die Redaktion.
2. `app/dist/production` ist der vollständige statische Produktionsstand einschließlich `CNAME`, Impressum, Datenschutz und `/redaktion`-Weiterleitung. Die Dateien auf einen Release-Branch von `rudelbar-pages` kopieren und dort einen Pull Request gegen `main` prüfen. Alte, im neuen Build nicht mehr vorhandene Dateien dürfen auf dem Release-Branch entfernt werden.
3. Das neue Backstage unter `https://rudelbar-cms-staging.christopher-harms.workers.dev/backstage#website`, seine Anmeldung und den Notfall-Link zur bisherigen Produktionsredaktion prüfen. Beide müssen dieselben Website-Produktionsinhalte zeigen. Entwicklungstests verwenden isolierte Fixtures; die historisch staging benannte Arbeitsumgebung enthält echte Daten.
4. Den Pull Request erst nach Freigabe nach `rudelbar-pages/main` übernehmen. Das ist der Schritt, der die Website auf `rudelbar.de` ersetzt. Es sind dafür keine Änderungen an Nameservern oder Mail-DNS nötig.

## Direkt nach der Veröffentlichung prüfen

- `https://rudelbar.de/` und `https://www.rudelbar.de/`: Startseite, nächster Termin, Team und Bilder.
- `https://rudelbar.de/redaktion` (beziehungsweise `/redaktion.html`): Weiterleitung direkt zum Website-Bereich im neuen Backstage; nach Anmeldung muss dieser Bereich erhalten bleiben. Dort muss Bisherige Redaktion den unabhängigen Notfallzugang öffnen.
- Datenschutz und Impressum über den Footer öffnen; die Seiten müssen im Website-Design erscheinen.
- „Aktuelles“ darf erst mit einem im Produktions-CMS veröffentlichten Beitrag erscheinen.
- Kontaktformular nur mit einer ausdrücklich als Test markierten Anfrage prüfen, weil es echte Nachrichten versendet.
- Eine mobile Breite sowie Navigation und Dialoge in der Redaktion prüfen.

## Rückweg

Bei einem Website-Problem den Produktions-Pull-Request auf `rudelbar-pages/main` zurücknehmen beziehungsweise den vorherigen Website-Commit erneut veröffentlichen. Das Produktions-Dataset und der Produktions-Worker bleiben dabei erhalten. Inhalte in Sanity nur gezielt ändern; ein Website-Rollback setzt Sanity nicht zurück.
