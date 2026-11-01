# Persönliche Rudelbar-Konten

Stand: 1. November 2026. Rudelbar verwendet eine eigene zentrale Anmeldung mit E-Mail und Passwort nach dem Prinzip der bestehenden Elbmafia-Anmeldung. Konten und Zugangsdaten bleiben vollständig getrennt von Elbmafia. Ein externer Anmeldedienst ist nicht erforderlich; die frühere OIDC-Vorbereitung wurde ersetzt.

Der gemeinsame Zugang **Redaktion bleibt aktiv**. Sein Passwort, Verifier, Sitzungsschlüssel und bestehende Sitzungen wurden nicht verändert. Auch die bisherigen Oberflächen bleiben erreichbar. Die Verwaltung erfolgt parallel im neuen [Backstage](https://rudelbar-cms-staging.christopher-harms.workers.dev/backstage#accounts).

## Einrichtung durch die Administration

1. Unter Personen & Benutzer ein aktives Personenprofil anlegen oder auswählen.
2. Unter Benutzer & Rechte ein Konto vorbereiten: Profil, eindeutige persönliche E-Mail, Freigabe und Aufgaben zuweisen.
3. Einladung erstellen. Entweder den einmal angezeigten Link persönlich weitergeben oder ausdrücklich den Versand per E-Mail auswählen.
4. Die Person öffnet den Link und wählt selbst ihr Passwort. Danach meldet sie sich unter `/anmelden` an. Einladungen gelten 24 Stunden.
5. Dasselbe Konto gilt für Redaktion, Backstage und den eigenständigen Live-Bereich. Die serverseitigen Rechte bestimmen die sichtbaren Inhalte.

Es gibt keine öffentliche Selbstregistrierung für interne Konten. Ein Personenprofil allein ist kein Benutzerkonto. Die Administration bestätigt die Zuordnung und gibt den Zugangslink an die Person weiter. Ein manuell weitergegebener Link bestätigt keine unabhängige E-Mail-Verifikation. Der Besitz dieses vertraulichen Links berechtigt einmalig zur Passworteinrichtung.

## Aufgaben und Widerruf

- Administration: Konten, Rechte, Inhalte und alle Abende.
- Redaktion: Webseiteninhalte, Angebote, Personen und alle Abende ohne Benutzerverwaltung.
- Abendleitung: Vorbereitung und Live-Betrieb zugeordneter Abende.
- Stationsbetreuung: Zugeordnete Stationen und gemeinsame Eingänge ausgewählter Abende.
- Gastgeber und Moderation: Live-Eingänge ausgewählter Abende.

Mehrere Aufgaben sind möglich. Veranstaltungsaufgaben setzen die aktuelle Mitgliedschaft im Abendteam voraus. Profilstatus und Rechte werden bei jedem Abruf kontrolliert. Änderungen am Konto beenden persönliche Sitzungen, Team-Links und offene Passwort-Links. Deaktivierte Konten können sich nicht anmelden und keine neuen Team-Links erhalten. Die eigene Administration kann sich nicht selbst deaktivieren oder ihre Administrationsrechte entfernen.

## Passwort und Wiederherstellung

Passwörter haben 16 bis 1024 Zeichen; ein längerer Satz ist geeignet. Unter Mein Konto lässt sich das Passwort nach Eingabe des bisherigen Passworts ändern. Die Änderung beendet alle persönlichen Sitzungen und Team-Links. Das gemeinsame Redaktionspasswort wird dadurch nicht verändert.

Bei Passwort vergessen wird ein einmaliger Resetlink mit 30 Minuten Gültigkeit angefordert. Bis zum Abschluss bleibt das alte Passwort gültig. Die öffentliche Antwort verrät nicht, ob ein freigegebenes Konto existiert. Bei noch nicht eingerichtetem Versand wird ausdrücklich an die Administration verwiesen. Die Administration kann bis dahin einen Passwort-Link persönlich weitergeben.

Mehrere noch gültige Links bleiben bis zur Verwendung oder zum Ablauf nutzbar. So führt eine unklare Versandbestätigung nicht dazu, dass eine bereits eingegangene E-Mail unbemerkt ungültig wird. Die erste erfolgreiche Passwortänderung entwertet atomar alle anderen Links dieses Kontos. Änderungen an Konto oder Rechten machen vorherige Links ebenfalls ungültig.

## Versand über info@rudelbar.de

Der Nutzer hat `info@rudelbar.de` als Absender festgelegt. Die Domain verwendet STRATO-Mailserver. Verbindungsdaten: `smtp.strato.de`, Port 465, TLS, Benutzername `info@rudelbar.de`. Quelle: [STRATO-Verbindungsdaten](https://www.strato.de/faq/mail/e-mailserver-adressen-ports-ssl-tls/).

Unter Benutzer & Rechte → Versand einrichten gibt die Administration das bestehende Postfachpasswort direkt in Backstage ein und schaltet den Versand ein. Das Passwort wird nie zurückgeliefert oder im Browsercode gespeichert. Speichern allein sendet keine E-Mail. Eine tatsächliche Zustellung ist erst nach einer ausdrücklich ausgelösten Einladung oder Passwortanforderung prüfbar. Stand der Veröffentlichung: Postfachpasswort fehlt, Versand ist daher noch nicht aktiviert und mit dem echten Postfach noch nicht getestet.

Mailversuche haben persistente Empfänger- und Gesamtlimits: mindestens 60 Sekunden Abstand, maximal fünf Versuche je Empfänger und 30 insgesamt pro Stunde. Bei nicht bestätigter SMTP-Annahme wird keine erfolgreiche Zustellung behauptet und nicht automatisch erneut gesendet. Eine bestätigte Annahme durch den Mailserver ist noch kein Beweis für die Zustellung im Posteingang.

## Speicherung und Betrieb

Die additive Migration `0004_native_accounts.sql` ergänzt Passwortnachweise, einmalige Links, persistente Limits und verschlüsselte Mailkonfiguration. Bisherige Daten, alte Identitätstabellen, Sitzungen und Push-Registrierungen werden nicht gelöscht. Historische OIDC-Tabellen bleiben ungenutzt bestehen.

Passwortnachweise verwenden PBKDF2-SHA256 mit 100.000 Iterationen und 24 zufälligen Salt-Bytes sowie einen serverseitigen, getrennt abgeleiteten HMAC-Pepper. Der Wert folgt dem vorhandenen Elbmafia-Muster und ist in der Cloudflare-Laufzeit geprüft. Mailzugangsdaten sind mit AES-GCM, zufälligem Nonce und getrennt abgeleitetem Schlüssel verschlüsselt. Der vorhandene Worker-Sitzungsschlüssel dient als Wurzelschlüssel; eine spätere Rotation benötigt eine geplante Migration der Mailverschlüsselung und persönlichen Passwortnachweise. Diese Einführung rotiert keinerlei Schlüssel.

Sitzungen gelten acht Stunden. Sitzungs- und Linktokens stehen nur als SHA-256-Hash in der Datenbank. Cookies sind HttpOnly, Secure und SameSite=Strict. Schreibzugriffe erfordern denselben Ursprung; angemeldete Kontoänderungen benötigen zusätzlich einen gültigen CSRF-Token. Login-Limits gelten am Netzwerkzugang und zusätzlich je normalisierter Anmeldeadresse. Linkverwendung und Passwortänderung sind atomar gegen gleichzeitige Kontoänderungen und Wiederverwendung geschützt.

## Prüfung und Grenzen

48 automatisierte Tests prüfen Anmeldung, alte Redaktion, Rollen, Stationsrechte, CSRF, Passwortänderung, Linkablauf, gleichzeitige Verwendung, Widerruf, Mailverschlüsselung, Limits, SMTP-Annahme und Header-Injection. Ein zusätzlicher Test in Workerd prüft Passwortableitung und Mailverschlüsselung. Der bestehende Push-Laufzeittest bleibt erfolgreich. Öffentliche Staging-Prüfungen und Browsernachweise stehen in `NATIVE-AUTH-VERIFICATION.json`.

Noch ausstehend ist die Abnahme mit einem echten persönlichen Teamkonto und mit dem eingerichteten Postfach. Es wurden hierfür keine echten Benutzerkonten angelegt und keine echten E-Mails verschickt. Dauerhafte Gästekonten, Kontakte und weitere Begegnungsfunktionen sind keine bereits fertigen Bestandteile dieser Kontenumstellung. Der QR-Einstieg für Gäste bleibt ohne Anmeldung möglich.
