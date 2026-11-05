# Website-Audit und Veröffentlichung: 5. November 2026

## Ausgangsstand vor dem Release

Vor Commit und Veröffentlichung direkt mit den laufenden Diensten abgeglichen:
- Öffentliche Website einschließlich geladenem JavaScript/CSS, Logo, Impressum, Datenschutz und Redaktions-Einstieg: bytegenau identisch mit rudelbar-pages/975e66a82f59d2568db524fcb782797e4763930f.
- Backstage: alle 86 ausgelieferten Oberflächendateien stimmen bytegenau mit Quelle 1d20008fa3434e04e950bd07b99dd08eea05d51d überein. Der direkt von Cloudflare heruntergeladene ausführbare Servercode ist ebenfalls identisch; nur Kommentare zu lokalen Abhängigkeitspfaden unterscheiden sich beim Nachbau.
- Der anschließende Entwicklungsstand e7a127de8220644e849bf50c157c50112332ee03 enthält gegenüber 1d20008 ausschließlich Dokumentationsänderungen.
- Notfallredaktion: nachgebauter Server bytegenau identisch mit dem Live-Code, Quelle 9d4bd06fd0186ea3fdd47e36543c7e9da6eabb6e.
- Vorhandene Versionen: Backstage 79a72b90-2a07-41e0-940b-300f987affda, Notfallredaktion e8fffdea-45b8-409c-810b-949b2267c369. Das neue Build-Geheimnis erzeugte danach Versionskopien ohne Codeänderung.
- rudelbar-flare ist archiviert und keine Quelle dieser Veröffentlichung.

## Umgesetzte Website-Punkte

1. Eigene HTML-Seiten, lesbare stabile URLs und Unterstützung alter Hash-Links.
2. JPEG-Vorschaubild mit unverändertem Logo auf dunklem Hintergrund und passende Favicons.
3. Responsive Sanity-Bilder, kleinere lokale WebP-Varianten und verzögertes Laden.
4. Individuelle Titel, Beschreibungen, Canonicals und Social-Metadaten.
5. Lesbare mobile Formularfelder, sichtbare Pflichtfelder, bessere Kontraste und zugängliche Versandmeldungen.
6. Individuelle Beschreibungen vorhandener Beitragsbilder und Anleitung in der Redaktion.
7. Direkte E-Mail- und Telefonlinks.
8. Informationen zum Anfragen und FAQ ohne erfundene Preise, Zusagen oder Einsatzradien.
9. Automatische Sitemap und robots.txt. Search-Console-Eigentümerschaft und tatsächliche Google-Indexierung gesondert prüfen.
10. Öffentliche Testwebsite mit noindex.
11. Organization-, Article- und Event-Daten aus tatsächlichen veröffentlichten Angaben.
12. Semantische Artikelabsätze, Überschriften, Listen und passende nächste Schritte.
13. Mobiles Menü mit 44-Pixel-Bedienelement, Zustand, Escape und Fokusrückgabe.
14. Sprung zum Hauptinhalt, Tastaturfokus und reduzierte Bewegung.
15. Nützlicher Zustand ohne kommenden Termin mit Instagram und Anfrage.
16. Rechtliche Seiten im Website-Design und eigene 404-Seite.
17. Ausdrückliche Zuordnung öffentlicher Website-Inhalte zu production beibehalten.
18. Web3Forms-Versand mit Fehlerbehandlung. Dienstannahme und tatsächlichen Postfacheingang getrennt nachweisen.
19. Redaktionsantworten und statische Oberflächen mit noindex/nofollow.

Rechtlicher Wortlaut, Anbieteridentität und bestehende Inhaltsbestände werden nicht neu interpretiert. Keine SQL-Migration, Passwortänderung, Inhaltskopie oder DNS-/Mailänderung gehört zu diesem Release.

## Laufende Veröffentlichung

app/scripts/build-site.mjs baut veröffentlichte Sanity-Inhalte als HTML. Im Browser werden sie zusätzlich aktuell geladen.

- Staging: Quellcode-main über .github/workflows/pages.yml, Dataset staging, noindex.
- Produktion: .github/workflows/production.yml in rudelbar-pages checkt einen ausdrücklich freigegebenen festen Quellcode-Commit aus rudelbar-2.0 aus. Spätere main-Änderungen werden dadurch nicht automatisch Produktionscode.
- Publish, Unpublish und Archivieren im CMS starten den Produktionsworkflow. Fehlende oder abgelaufene Schlüssel verhindern keine CMS-Speicherung; der regelmäßige Build bleibt als Rückfallebene.
- RUDELBAR_GITHUB_WORKFLOW_TOKEN liegt ausschließlich in beiden Worker Secrets. Nur Actions-Zugriff auf rudelbar-pages, kein Quellcode-Schreibzugriff. Ablauf: 3. Februar 2027; vorher rotieren.
- Zeitgesteuerte GitHub-Builds laufen nominell alle 15 Minuten und können vom Anbieter verzögert werden. Neue statische Detailseiten und Linkvorschauen entstehen mit dem nächsten erfolgreichen Build.
- Erstes Veröffentlichen fixiert den URL-Slug. Titeländerungen ändern ihn danach nicht.

## Grenzen und Rückkehr

Backstage bleibt im historisch benannten Worker rudelbar-cms-staging mit bestehenden D1-, R2-, Durable-Object-, RPC- und Cron-Bindungen.

Die unabhängige Notfallredaktion wird aus fix/legacy-cms-audit-2026-11-05 veröffentlicht. Nicht den modernen Backstage-Code mit dessen alter wrangler.production.jsonc auf diesen Worker übertragen.

Website-Rollback: vorherigen freigegebenen Quellcode im Produktionsworkflow verwenden oder zur gesicherten früheren Pages-Veröffentlichung zurückkehren. Worker-Rollbacks separat über die Cloudflare-Versionen. Inhaltsdaten bleiben unabhängig.

noindex ist eine Suchmaschinenanweisung und keine Zugangskontrolle. Anmeldung und Berechtigungen bleiben erforderlich. Bereits indexierte Treffer verschwinden erst nach erneuter Verarbeitung durch den Suchdienst.
