# Persönliche Backstage-Konten, erste Ausbaustufe

Aktueller Architekturabgleich: Die eigene zentrale Anmeldung aus Elbmafia Studio/Backstage wurde als Alternative geprüft. Auth0 ist keine technische Voraussetzung. Der vorhandene gemeinsame Rudelbar-Zugang funktioniert; die persönliche Anmeldung ist weiterhin vorbereitet, aber noch nicht aktiviert. Siehe [aktuellen Übergangsstand](BACKSTAGE.md).

Der gemeinsame Zugang **Redaktion bleibt aktiv**. Weder sein Passwort noch seine Sitzungen werden bei der Einführung persönlicher Konten verändert. Es gibt keine automatische Abschaltung und keine automatische Übernahme eines Personenprofils als Benutzerkonto.

## Bereits implementiert

- Backstage → Benutzer: Konto mit vorhandener aktiver Person und einer eindeutigen Anmelde-E-Mail verknüpfen, Aufgaben vergeben und Konto deaktivieren.
- Administration: Konten und Rechte sowie alle Inhalte und Abende.
- Redaktion: Webseiteninhalte, Angebotskatalog, Personen und alle Abende, ohne Benutzerverwaltung.
- Abendleitung: Vorbereitung und Live-Betrieb ausgewählter Abende, ohne globale Inhalte oder Benutzerverwaltung.
- Stationsbetreuung: Zugeordnete Stationen und gemeinsame Eingänge ausgewählter Abende.
- Gastgeber und Moderation: Live-Eingänge ausgewählter Abende. Die spätere Social-Wall- und Begegnungsmoderation ist noch nicht Bestandteil dieser Ausbaustufe.
- Mehrere Aufgaben pro Person. Bei Veranstaltungsaufgaben muss das Personenprofil auch aktuell zum Abendteam gehören. Das Entfernen aus dem Team beendet den Zugriff beim nächsten Abruf.
- Kontorechte und Profilstatus werden bei jedem Zugriff geprüft. Kontoänderungen beenden persönliche Sitzungen, alte Team-Links und offene Einladungen. Das Deaktivieren eines Kontos verhindert auch neue Team-Links.
- Einladungen sind sieben Tage gültig, einmalig und an die bestätigte E-Mail gebunden. Eine neue Einladung ersetzt die vorherige. Links werden manuell weitergegeben, es wird keine E-Mail aus Rudelbar versendet.
- Kontoaktivitäten werden mit der tatsächlichen Person protokolliert. Alte gemeinsame Aktionen bleiben Redaktion zugeordnet.
- Persönliche Mitteilungen und Lesestände verwenden die eigene Konto-ID. Vor dem Versand werden aktuelle Sitzungen, Rechte und Stationszuordnungen erneut geprüft.

## Persönliche Anmeldung aktivieren

Empfehlung: **Auth0 Universal Login** für Registrierung, E-Mail-Bestätigung und Passwort-Wiederherstellung. Die Rudelbar-Rechte bleiben in unserer Datenbank. Die Anbindung nutzt OpenID Connect mit Authorization Code, PKCE, State, Nonce und zusätzlicher Signaturprüfung. Eine andere kompatible OIDC-Lösung lässt sich später über die Konfiguration einsetzen.

Noch nicht erledigt: Es wurde kein externer Mandant eingerichtet. Echte persönliche Anmeldungen und Einladungen sind bis zur Verbindung des Dienstes in Staging gesperrt. Konten und Aufgaben lassen sich bereits vorbereiten. Keine Passwörter werden in Rudelbar angelegt oder gespeichert.

1. Einen Auth0-Mandanten in einer passenden EU-Region anlegen und eine Anwendung vom Typ **Regular Web Application** erstellen.
2. Als Allowed Callback URL exakt `https://rudelbar-cms-staging.christopher-harms.workers.dev/api/auth/callback` hinterlegen. Client Authentication Method: **Post**. Für eine lokale Prüfung eine separate Testanwendung verwenden.
3. Eine Datenbank-Verbindung für E-Mail und Passwort aktivieren, E-Mail-Verifizierung und Passwort-Wiederherstellung prüfen. Rudelbar lässt nur verifizierte E-Mails zu. Das Erstellen eines Auth0-Kontos allein verleiht keinerlei Rudelbar-Zugriff.
4. Für die Auslieferung an echte Nutzer einen eigenen E-Mail-Anbieter und Absender im Auth0-Mandanten konfigurieren. Die eingebauten Test-E-Mails sind keine dauerhaft eingerichtete Rudelbar-Mailzustellung.
5. `OIDC_ISSUER` (mit abschließendem Slash) und `OIDC_CLIENT_ID` als Worker-Konfiguration hinterlegen. `OIDC_CLIENT_SECRET` ausschließlich als Cloudflare-Secret hinterlegen. Niemals in Git oder Browsercode speichern. Nur Staging verbinden.
6. In Backstage ein Konto mit der tatsächlichen persönlichen E-Mail vorbereiten, die Aufgaben prüfen und eine Einladung erstellen. Der Link erscheint nur einmal und wird direkt an die Person übergeben.
7. In einem zweiten Browser anmelden: bestätigte E-Mail, Einladungsannahme, erlaubte und gesperrte Bereiche, Abmelden sowie Deaktivierung gegen eine bereits geöffnete Sitzung prüfen. Erst damit ist die externe Auth0-Verbindung abgenommen.

Ein Passwort-Reset wird im Anmeldedienst durchgeführt. Danach muss die Person sich erneut bei Rudelbar anmelden. Die Einführung betrifft zunächst das interne Team. Der QR-Einstieg für Gäste bleibt ohne Registrierung möglich.

## Daten und Migration

Die additive D1-Migration `admin/migrations/0003_accounts.sql` ergänzt Konten, Identitäten, Einladungen, widerrufbare Sitzungen, kurzlebige Anmeldevorgänge und das Konto-Protokoll. Bestehende Abende, Personen, Besucher, Gespräche und Push-Registrierungen werden erhalten. Auth0-Identitäten werden über `(issuer, subject)` mit einer stabilen Rudelbar-Konto-ID verknüpft; Namen und E-Mail-Adressen sind keine technischen Identitäten.

Anmeldesitzungen gelten acht Stunden. Einladungs- und Sitzungstokens werden nur als SHA-256-Hash gespeichert. Anmeldecookies sind HttpOnly und Secure; Schreibzugriffe benötigen denselben Ursprung und den persönlichen CSRF-Token. Die Provider-Anmeldung ist mit einem simulierten OIDC-Anbieter samt echter RSA-Signatur getestet, einschließlich falscher Zielanwendung, Nonce, Aussteller, Signatur, unbestätigter E-Mail und wiederholtem Callback. Das ersetzt noch keinen Test mit einem echten Auth0-Mandanten.

## Nächste Funktionsbausteine

Auf dieser Identität und Rechteprüfung bauen optionale dauerhafte Gästekonten und bestätigte Kontakte auf. Danach folgen Begegnungsangebote mit verschiedenen Matching-Arten, moderierte Runden und Social Wall. Jedes Modul benötigt eine Backstage-Steuerung pro Abend; Dating bleibt standardmäßig aus und braucht einen eigenen ausdrücklichen Opt-in. Diese Funktionen sind weiterhin geplant und werden durch die Benutzerverwaltung noch nicht als fertig behauptet.

Quellen: [Auth0 Authorization Code](https://auth0.com/docs/authenticate/login/oidc-conformant-authentication/oidc-adoption-auth-code-flow), [Auth0 E-Mail-Vorlagen](https://auth0.com/docs/customize/email/email-templates), [oauth4webapi](https://github.com/panva/oauth4webapi).
