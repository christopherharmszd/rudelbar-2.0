# Fachliches Zielbild der Begegnungsplattform

Vom Inhaber am 11. November 2026 während der Gäste-UX-Umsetzung ergänzt. Verbindliche fachliche Leitplanken, kein Implementierungsnachweis und kein Auftrag zum sofortigen Datenmodellumbau. Die laufende Iteration bleibt bei Willkommen, Namenseingabe und Startseite.

Fachliche Ergänzung zur Rudelbar-Begegnungsplattform

Die übergebene UX-Aufgabe ist Teil einer größeren Plattform. Diese Zusammenhänge müssen bei der Gestaltung berücksichtigt werden, auch wenn jetzt zunächst nur Begrüßung, Namenseingabe und Startseite umgesetzt werden.

Die folgenden Punkte beschreiben das vereinbarte fachliche Zielbild. Sie sind kein Nachweis dafür, dass alle Funktionen bereits implementiert sind. Den tatsächlichen Stand bitte im Repository prüfen.

1. Zweck der Plattform

Rudelbar soll Menschen vor Ort leichter zusammenbringen: gemeinsam spielen, ins Gespräch kommen, Musik erleben, tanzen und Kontakte knüpfen. Die App unterstützt das reale Geschehen.

Gäste kommen mit unterschiedlichen Bedürfnissen: allein, als bestehende Gruppe, offen für neue Bekanntschaften oder zunächst nur zur Orientierung. Der Einstieg darf sie nicht zu einer dieser Situationen zwingen.

Das Team behält im Backstage die Kontrolle darüber, welche Funktionen, Angebote und Interaktionen verfügbar sind.

2. Die Grundlage ist ein Beziehungsmodell

Die Plattform darf nicht als Sammlung voneinander unabhängiger Formulare oder als einzelne Abendkonfiguration aufgebaut werden. Gedankliches Vorbild ist eine CMDB: zentral gepflegte Objekte mit ausdrücklichen Beziehungen untereinander.

Zu unterscheiden sind mindestens:
- Ausstattung und physische Ressourcen, beispielsweise Wagen, Grill, Pavillons oder Spielgeräte.
- Angebote und Aktivitäten, beispielsweise Cornhole, Poker oder gemeinsames Spielen.
- Programminhalte, beispielsweise DJ, Karaoke oder eine Band.
- Stände und Stationen als Orte, an denen mehrere Angebote stattfinden können.
- Personen, Organisationen und fachliche Zuständigkeiten.
- Wiederverwendbare Vorlagen.
- Konkrete Abende mit ihrer tatsächlich freigegebenen Konfiguration.
Diese Begriffe beschreiben fachliche Unterschiede. Sie schreiben weder feste technische Tabellen noch die spätere Benennung in der Oberfläche vor.

3. Inhalte einmal pflegen und mehrfach verwenden

Beschreibungen, Bilder, Eigenschaften und Funktionszuordnungen sollen zentral gepflegt und anschließend wiederverwendet werden.

Beispiel: Ein Angebot „Cornhole“ wird einmal angelegt. Es kann mehreren Stationen zugeordnet und bei unterschiedlichen Abenden verwendet werden. Die Beschreibung wird dabei nicht jedes Mal neu erfasst.

Eine Station kann mehrere Angebote enthalten. Ein Angebot darf gleichzeitig an mehreren Stationen stattfinden. Deshalb reicht eine einfache Beziehung „Angebot gehört zu genau einer Station“ nicht aus.

Abendbezogene Angaben wie Standort, Verfügbarkeit oder Betreuung müssen von den zentralen Stammdaten unterscheidbar bleiben. Ein Lageplan soll bestehende Stationen verknüpfen können; freie zusätzliche Kartenobjekte bleiben ebenfalls sinnvoll.

4. Ein Angebot ist mit seiner Funktion verbunden

Die Beziehung endet nicht bei Name und Beschreibung. Ein Angebot kann bestimmte Interaktionen ermöglichen:
- DJ: Musikwünsche.
- Karaoke: Anmeldung zum Singen.
- Spielangebot: Mitspieler suchen oder einer Runde beitreten.
- Willkommensteam: Fragen und Unterstützung.
- Memory Wall: Beiträge einreichen und ansehen.
Wenn ein Angebot an mehreren Stationen verfügbar ist, muss eine Anfrage bei der richtigen Station beziehungsweise Betreuung ankommen. Die Identität des zentralen Angebots allein genügt dafür nicht.

Die technische Umsetzung muss daher zwischen dem wiederverwendbaren Angebot und seinem konkreten Einsatz unterscheiden können.

5. Zuständigkeit und Zugriffsberechtigung sind verschiedene Dinge

Eine fachliche Rolle wie „Karaoke betreuen“ ist nicht dasselbe wie eine Berechtigungsrolle wie „Administrator“.

Fachliche Zuständigkeiten verbinden Personen mit Angeboten, Stationen oder Aufgaben. Berechtigungen bestimmen dagegen, welche Bereiche und Aktionen ein Konto nutzen darf.

Personen werden zentral verwaltet und über ihre Profile zugeordnet. Ansprechpartner dürfen keine beliebigen Freitextnamen sein. Betreuung ist optional: Eine Station kann ausdrücklich unbetreut sein.

Grundzuordnungen sollen wiederverwendbar sein. Für einen konkreten Abend müssen sie angepasst werden können, ohne die zentrale Grundkonfiguration unbeabsichtigt zu verändern. Mehrere zuständige Personen müssen möglich sein.

Teamzugehörigkeit und Partnerzugehörigkeit sind zusätzliche Profileigenschaften. Beispielsweise können Personen zum Rudelbar-Team oder zu einem beteiligten Verein gehören. Avatar und Organisationskennzeichnung müssen davon unabhängig von ihren Berechtigungen abbildbar sein.

6. Vorlage und konkreter Abend bleiben getrennt

Der Kalendereintrag ist nicht der Ausgangspunkt der gesamten Konfiguration.

Zunächst sollen unabhängig von einem Datum Inhalte, Beziehungen und wiederverwendbare Vorlagen vorbereitet werden können. Eine Vorlage beschreibt eine mögliche Zusammenstellung und Gäste-Erfahrung.

Erst anschließend wird diese Zusammenstellung für einen konkreten Abend verwendet und angepasst:
- Was ist tatsächlich dabei?
- Wo findet es statt?
- Wer betreut es?
- Welche Funktionen stehen Gästen zur Verfügung?
- Welche Inhalte werden angezeigt?
Öffentliche Website-Termine können damit verknüpft werden. Private Veranstaltungen müssen ohne öffentlichen Website-Termin möglich sein.

Die Regeln, wie spätere Änderungen an Stammdaten oder Vorlagen bestehende Abendkonfigurationen beeinflussen, müssen ausdrücklich definiert werden. Keine unbeabsichtigte automatische Änderung eines bereits laufenden Abends.

7. Veröffentlichung und Öffnung sind getrennte Entscheidungen

Redaktionelle Vorbereitung, veröffentlichter Inhalt und die Zugänglichkeit der Gäste-App sind unterschiedliche Zustände.

Das Team muss Inhalte vorbereiten und prüfen können, bevor Gäste sie sehen. Außerdem muss es die App für einen Abend öffnen und schließen können.

Ein Veröffentlichungscheck soll die relevanten Abhängigkeiten verständlich prüfen. Unbetreute Angebote sind dabei nicht automatisch fehlerhaft.

Website-Veröffentlichung und App-Freigabe dürfen nicht unbeabsichtigt gekoppelt werden. Ein privater Testabend darf insbesondere keine Änderung der öffentlichen Webseite auslösen.

8. Einzelpersonen und Gruppen gehören zum Zielbild

Der Gast bleibt eine eigenständige Person beziehungsweise ein eigenständiger Gastzugang. Eine Gruppe – in der Kommunikation möglicherweise „Rudel“ – ist eine zusätzliche Beziehung.

Eine Gruppe kann gemeinsam teilnehmen, kommunizieren und Inhalte teilen. Eine Person muss eine Gruppe einfach erstellen und andere möglichst unkompliziert einladen können. Ob und wie Gruppen über einen Abend hinaus bestehen, ist noch zu entscheiden.

Gruppen sind kein Ersatz für persönliche Identität. Auch innerhalb einer Gruppe müssen persönliche Einstellungen, Nachrichten und Freigaben getrennt bleiben.

Die genaue Benennung und die Rechte der Person, die eine Gruppe erstellt, sind noch offen. „Alpha-Wolf“ war keine beschlossene Produktbezeichnung.

9. Inhalt, Empfänger und Darstellung müssen getrennt werden

Die Memory Wall war ein Beispiel für eine allgemeinere Anforderung. Es geht nicht nur um zusätzliche Fotogalerien.

Ein Foto oder Text kann bestimmt sein für:
- die gemeinsame Wall eines Abends,
- eine bestimmte private Gruppe,
- eine direkte Nachricht an eine bestimmte Person.
Diese Sichtbarkeit muss ausdrücklich modelliert und auf dem Server durchgesetzt werden. Eine private Gruppenwand darf nicht lediglich eine ausgeblendete öffentliche Ansicht sein.

Mehrere Gruppen können jeweils eigene private Wände haben. Eine öffentliche Leinwand darf daraus keine privaten Beiträge übernehmen.

In der Oberfläche soll die Auswahl leicht sein und nur relevante Möglichkeiten anbieten. Eine Gruppenoption erscheint beispielsweise nur bei bestehender Gruppenmitgliedschaft. Trotzdem muss eindeutig erkennbar bleiben, wer einen Beitrag sehen kann. Ein späterer Wechsel zu einem größeren Empfängerkreis darf nicht stillschweigend passieren.

10. Profil, Einrichtung und laufende Nutzung

„Mein Profil“ ist der zentrale Ort für persönliche Angaben, Gaststatus, Einstellungen, Mitteilungen und verwaltbare Freigaben.

Der gewünschte Ablauf lautet:
- Einfach ankommen und verstehen, was heute möglich ist.
- Mit möglichst wenigen Schritten teilnehmen.
- Beim ersten Aufruf einer neuen Funktion eine kurze, passende Einführung erhalten.
- Danach dieselbe Funktion ohne wiederkehrende Erklärung und unnötige Einrichtung nutzen.
Notwendige Zustimmungen werden verständlich eingeholt und bleiben anschließend zentral verwaltbar. Daraus folgt keine pauschale Einwilligung in jede spätere Nutzung: Empfängerauswahl, Veröffentlichung und zusätzliche externe Verwendung müssen unterscheidbar bleiben.

Gerätespezifische Einrichtungshinweise erscheinen nur auf passenden Geräten. Die Installation als Web-App darf nicht Voraussetzung für die grundlegende Teilnahme sein.

11. Begegnungen sind mehr als Dating

Gemeinsam spielen, einen Tanzpartner finden, neue Menschen kennenlernen und Dating sind unterschiedliche Anlässe innerhalb derselben Begegnungsplattform.

Dating ist eine ausdrücklich gewünschte, aber separat zuschaltbare und freiwillige Funktion. Sie soll freundlich, spielerisch und auf den Abend ausgerichtet sein. Moderierte Angebote wie Speed-Dating können hinzukommen.

Eine Teilnahme an allgemeinen Begegnungen darf nicht als Dating-Interesse interpretiert werden. Das Team muss die einzelnen Möglichkeiten konfigurieren und steuern können.

12. Backstage, Live und Auswertung berücksichtigen

Backstage dient der Vorbereitung und Verwaltung. Die Live-Oberfläche unterstützt die Betreuung während des Abends und darf einen eigenen, fokussierten Einstieg haben.

Anfragen müssen anhand ihrer Beziehungen den richtigen Zuständigkeiten zugeordnet werden. Dazu gehören auch Moderationsaufgaben, etwa neue Memory-Wall-Beiträge. Ein Eingang „Alle“ muss entweder vollständig sein oder seinen eingeschränkten Umfang klar benennen.

Für die Auswertung müssen die fachlichen Zusammenhänge erhalten bleiben: Welcher Abend, welches Angebot, welcher konkrete Einsatz und welche Interaktion? Technische Cloudflare-Aufrufe sind keine eindeutigen Besucherzahlen. Andere Anwendungen im selben Cloudflare-Konto dürfen nicht in Rudelbar-Auswertungen einfließen.

Zusätzliche Analyse-Cookies wurden nicht gewünscht. Daraus folgt keine Abschaffung notwendiger Anmeldemechanismen.

Konsequenz für die aktuelle UX-Aufgabe

Jetzt keinen umfassenden Datenmodellumbau beginnen. Begrüßung, Namenseingabe und Startseite direkt in der bestehenden App umsetzen.

Dabei aber keine neuen Annahmen fest einbauen, die diesem Zielbild widersprechen: keine starren Angebotskategorien, keine Pflichtbetreuung, keine Gleichsetzung von Gast und Gruppe, keine fest öffentliche Sichtbarkeit aller Beiträge und keine erneute Kopplung der gesamten Konfiguration an einen Kalendereintrag.

Die Gästeansicht zeigt, was Gäste erleben und tun können. Sie bildet nicht einfach die interne Ausstattungsliste ab.