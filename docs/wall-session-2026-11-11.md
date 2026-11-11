# Memory Wall: Gastzugang und gesammeltes Feedback

## Konkreter Versandfehler

Die Mobilaufnahmen des Inhabers zeigen einen vorbereiteten zweiten Foto-Beitrag mit Text, sichtbarer Vorschau und beiden gesetzten Freigaben. Oberhalb des langen Formulars steht „Bitte melde dich zuerst mit deinem Vornamen an.“ Das Absenden wirkt ohne sichtbare Reaktion. Im Live-Bereich war weiterhin nur der erste Beitrag vorhanden.

Isoliert nachgestellt: zwei direkte Beiträge funktionieren mit gültigem Gastzugang. Wird der Zugang bei weiterhin geöffnetem Formular ungültig, liefert der Wall-Aufruf 401. Der gemeinsame Browserzustand speicherte die Anmeldung jedoch nur als dauerhaftes `ready=true`; auch erneutes Öffnen stellte diese Verbindung nicht wieder her. Der Fehlertext erschien grau statt in der vereinbarten Fehlerfarbe und außerhalb des sichtbaren Absendeabschnitts.

Damit ist der fehlerhafte Umgang mit einem verlorenen Gastzugang belegt. Nicht belegt ist, wodurch der konkrete iPhone-Gastzugang verloren ging oder ob ein Deployment, Browserzustand oder ein anderer Vorgang beteiligt war. Der neue Mitteilungs-Wizard ist nicht als Ursache nachgewiesen.

Zusätzlich belegt: Die vorzeitigen Rückgaben beim Lesen von Wall-, Gesprächs- und Begegnungsmitteilungen enthielten keine Sitzungsablaufzeit. Der Gäste-Worker konnte dadurch `Max-Age=NaN` für das vorhandene Cookie ausgeben. Ein neuer Test schlägt am ursprünglichen Code genau mit dieser Ausgabe fehl. Das Verhalten des konkreten iPhones bei dieser fehlerhaften Antwort ist nicht nachgewiesen.

## Begrenzte Korrektur

- Mitteilungsbestätigungen liefern die authentifizierte Ablaufzeit mit. Der Gäste-Worker setzt Cookies ausschließlich bei einer endlichen Ablaufzeit und lässt andernfalls das vorhandene Cookie unangetastet. Die ursprüngliche serverseitige Gültigkeit wird nicht verlängert.
- Explizites Erneuern der Gastanmeldung; gleichzeitige Anmeldeaufrufe teilen denselben laufenden Auftrag. 401 im gemeinsamen API-Zugang verwirft den veralteten Bereitschaftsstatus.
- Wall-Fehler direkt vor der Absendeaktion, mit Alert-Semantik und Fokus. Text `#FFB4AB` auf `#321D1C` gemäß der bereits erlaubten Fehlerfarben; konkrete Aktion „Erneut anmelden“.
- Foto, Vorschau, Text und gewählte Freigaben bleiben während der erneuten Anmeldung im geöffneten Dialog erhalten. Danach sendet der Gast bewusst erneut. Eine neue Versandkennung verhindert die Wiederverwendung einer zum alten Zugang gehörenden Fotoreservierung.
- Sichtbarer Übertragungsstatus. Kein automatisches Absenden oder stilles Erteilen von Freigaben.
- Keine Wiederzuordnung früherer privater Beiträge allein über einen gleichen Vornamen. Ein tatsächlich gelöschter oder widerrufener anonymer Zugang lässt sich dadurch nicht wiederherstellen.

249 Tests erfolgreich, einschließlich sechs neuer Prüfungen für gleichzeitige Anmeldung, explizite Erneuerung/erneuten Versuch, fehlenden Vornamen sowie gültige Cookie-Ablaufzeiten nach dem Lesen einer Wall-Mitteilung. Isolierter Gesamtabend erfolgreich. Im Browser wurden zwei direkte Einreichungen, der 401-Zustand, erneutes Anmelden mit erhaltenem Foto/Text sowie der anschließende echte lokale Foto-Upload geprüft. Rotdarstellung und fokussierte Aktion mit den berechneten Farben bestätigt. Eine bereits geöffnete alte App-Version benötigt zum Laden des korrigierten Codes ein Neuladen; deren alter Entwurf wird dadurch nicht nachträglich über Reload hinweg gespeichert.

Veröffentlicht aus Quelle `6c0b9c52977bc73da0f5e1bcb9d21be7b0f32b4c`, Quellbaum `550ac918eef1f064350fb7c8e01ecd69cf1c981c`:

- Backstage/Live `8cb9b8fe-b44c-41ea-ad82-a60ba61bee50`.
- Gäste-App `13d2b20c-d8aa-4d0a-b105-c4f04a2eb805`.
- 24 tatsächliche Online-Dateien stimmen per SHA-256 mit der Quelle überein; sämtliche abgefragten Bindungen identisch zum vorherigen Stand. Privater Online-Einstieg lädt ohne beobachtete Browserfehler.
- Website weiterhin Quelle `c5178a1b099fad1d7baee4013921d891925b1038`. Keine Änderung an Konten, Berechtigungen, Inhaltsbeständen oder Datenbankschema.
- Changelog `Rudelbar_Changelog_2026-11-11_V1.3.pdf`: eine Seite, gerendert visuell geprüft; ältere Fassungen erhalten. Lokaler Fehlerbeleg unter `outputs/wall-session-fix-2026-11-11/` im Aufgabenordner, geschützte Prüfprotokolle unter `.qa/`.

Gezielter Code-Rückweg: vorherige zusammengehörige Versionen Backstage `65daf458-d986-4f25-b411-ebfea6ac7d4c`, Gäste-App `ef116ae3-5b35-499d-ae99-180ff9ff5635`. Keine Rücksetzung der Inhalte oder Gastdaten.

## Gesammeltes Feedback: noch nicht umgesetzt

Auf ausdrückliche Präzisierung des Inhabers wird zuerst der konkrete Versandfehler abgearbeitet. Die folgenden Punkte sind eigenständige Aufgaben, keine bereits erledigten Änderungen:

| Punkt | Bestätigter Befund / gewünschtes Ergebnis | Stand |
| --- | --- | --- |
| Goldene Leerfläche | „Leinwand öffnen“ hat berechnet Goldschrift auf Goldfläche. Der Übernehmen-Button selbst ist lesbar. | Fehler bestätigt, Korrektur offen |
| Absendeabschluss | Nach erfolgreichem Senden Dialog schließen, klare Bestätigung und eigener Status unter „Meine Momente“; bei Fehlern Entwurf erhalten. | Feedback aufgenommen |
| Kürzerer Fotoablauf | Foto und optionaler Text im Mittelpunkt; lange Erklärungen bedarfsgerecht erreichbar. | Feedback aufgenommen |
| Zentrale Freigaben | Entscheidungen nachvollziehbar verwalten, wiederholte Bestätigungen vereinheitlichen; externe Verwendung getrennt und freiwillig. Umfang, Zweck und Widerruf müssen transparent bleiben. | Konzept besprochen, keine Freigabedaten geändert |
| Vollständiger Live-Eingang | Auch Wall-Prüfungen, Begegnungs-/Spielrunden, Meldungen und weitere Aufgaben mit Status, Zuständigkeit und Zählern innerhalb der jeweiligen Rechte zusammenführen. | Feedback aufgenommen |
| Sichtbare Testtexte | Keine Demo-/Testkennzeichnungen in der zu bewertenden Gäste-Experience. Vorhandene Titel, Uhrzeit-/Ortszusätze und Wall-Notice später gezielt bereinigen. Schutz- und Sichtbarkeitsinformationen verständlich erhalten. | Verstoß bestätigt, noch keine Textentfernung |

Keine Veröffentlichung dieses Fixes darf als Umsetzung dieser offenen UX-/Inhaltsaufgaben ausgegeben werden.
