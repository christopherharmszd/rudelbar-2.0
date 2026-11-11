# Memory Wall: Gastzugang und gesammeltes Feedback

## Konkreter Versandfehler

Die Mobilaufnahmen des Inhabers zeigen einen vorbereiteten zweiten Foto-Beitrag mit Text, sichtbarer Vorschau und beiden gesetzten Freigaben. Oberhalb des langen Formulars steht „Bitte melde dich zuerst mit deinem Vornamen an.“ Das Absenden wirkt ohne sichtbare Reaktion. Im Live-Bereich war weiterhin nur der erste Beitrag vorhanden.

Isoliert nachgestellt: zwei direkte Beiträge funktionieren mit gültigem Gastzugang. Wird der Zugang bei weiterhin geöffnetem Formular ungültig, liefert der Wall-Aufruf 401. Der gemeinsame Browserzustand speicherte die Anmeldung jedoch nur als dauerhaftes `ready=true`; auch erneutes Öffnen stellte diese Verbindung nicht wieder her. Der Fehlertext erschien grau statt in der vereinbarten Fehlerfarbe und außerhalb des sichtbaren Absendeabschnitts.

Damit ist der fehlerhafte Umgang mit einem verlorenen Gastzugang belegt. Nicht belegt ist, wodurch der konkrete iPhone-Gastzugang verloren ging oder ob ein Deployment, Browserzustand oder ein anderer Vorgang beteiligt war. Der neue Mitteilungs-Wizard ist nicht als Ursache nachgewiesen.

## Begrenzte Korrektur

- Explizites Erneuern der Gastanmeldung; gleichzeitige Anmeldeaufrufe teilen denselben laufenden Auftrag. 401 im gemeinsamen API-Zugang verwirft den veralteten Bereitschaftsstatus.
- Wall-Fehler direkt vor der Absendeaktion, mit Alert-Semantik und Fokus. Text `#FFB4AB` auf `#321D1C` gemäß der bereits erlaubten Fehlerfarben; konkrete Aktion „Erneut anmelden“.
- Foto, Vorschau, Text und gewählte Freigaben bleiben während der erneuten Anmeldung im geöffneten Dialog erhalten. Danach sendet der Gast bewusst erneut. Eine neue Versandkennung verhindert die Wiederverwendung einer zum alten Zugang gehörenden Fotoreservierung.
- Sichtbarer Übertragungsstatus. Kein automatisches Absenden oder stilles Erteilen von Freigaben.
- Keine Wiederzuordnung früherer privater Beiträge allein über einen gleichen Vornamen. Ein tatsächlich gelöschter oder widerrufener anonymer Zugang lässt sich dadurch nicht wiederherstellen.

246 Tests erfolgreich, einschließlich drei neuer Prüfungen für gleichzeitige Anmeldung, explizite Erneuerung/erneuten Versuch und fehlenden Vornamen. Isolierter Gesamtabend erfolgreich. Im Browser wurden zwei direkte Einreichungen, der 401-Zustand, erneutes Anmelden mit erhaltenem Foto/Text sowie der anschließende echte lokale Foto-Upload geprüft. Rotdarstellung und fokussierte Aktion mit den berechneten Farben bestätigt. Eine bereits geöffnete alte App-Version benötigt zum Laden des korrigierten Codes ein Neuladen; deren alter Entwurf wird dadurch nicht nachträglich über Reload hinweg gespeichert.

Veröffentlichungsnachweis folgt nach erfolgreichem Online-Abgleich. Keine Änderung an Konten, Berechtigungen, Inhaltsbeständen oder Datenbankschema.

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
