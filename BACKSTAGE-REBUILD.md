# Backstage: vereinbarter Umbau

Die Arbeitsumgebung enthält echte Daten. Website-Inhalte bleiben mit production verbunden, interne App-Daten mit dem vorhandenen staging-Bestand und LIVE_DB. Keine Beispiele anlegen, keine Zugangsdaten verändern, keine bestehende Freigabe automatisch überschreiben.

## Umfang

- Verständliche Navigation: Webseite, Abende, Inhalte, Bilder, Team; Unterpunkte oben, kurze mobile Beschriftungen.
- Frei verwaltete Kategorien mit passenden Eigenschaften, einschließlich Speisekarten; bestehende Katalogkennungen und Zuordnungen erhalten.
- Wiederverwendbare Vorlagen mit Standardteam; getrennte, auch undatierte Abendvorbereitung und optionaler Verknüpfung zum Website-Termin.
- Geführter Abschluss mit serverseitiger Prüfung und Gästevorschau; Entwurf, Freigabe und Öffnen bleiben getrennt.
- CSV-Vorlage, Export, Spaltenzuordnung, Prüfung und bewusster Import mit Versionsschutz.
- Zentrale Bilderübersicht und gemeinsame Bildauswahl einschließlich direktem Upload und Fotoaufnahme.
- Bilder für alle Inhalte, schaltbare Inhaltsbereiche und Stationsdetails; Abendfotos durch ausdrücklich berechtigte Stationsbetreuung.
- Gäste-App erhält die nötige funktionale Unterstützung; ihre umfassende Neugestaltung folgt später.

## Prüfung

Schema- und Berechtigungstests, Import-Wiederholung und Konflikte, Trennung von Vorlagen/Entwurf/Freigabe, Website-/App-Bilder, Stationsrechte und öffentliche Schalter. Browserprüfung ausschließlich mit isolierten Daten; in der Arbeitsumgebung nur lesende Abschlussprüfung. Vor der Bereitstellung Bestände sichern und danach vergleichen.

## Bedienwege

- **Webseite**: Aktuelles, öffentliche Termine und das Rudel. Der Notfallzugang „Bisherige Redaktion“ bleibt hier erhalten.
- **Abende**: Unsere Abende und Vorlagen. Eine Vorlage enthält Auswahl, Ansicht, Stationen und Standardteam. Für einen konkreten Abend wird eine eigene Vorbereitung angelegt. Datum und Ort dürfen noch offen sein; vor dem Öffnen müssen sie vollständig sein.
- **Inhalte**: Alle Inhalte, Kategorien, Papierkorb. Eigene Kategorien erhalten passende Angaben für Informationen, Aktivitäten, Programm oder eine Karte mit Preisen. Die bisherigen Kennungen und Produkte bleiben erhalten.
- **Bilder**: Gäste-App und Webseite. Der Speicher folgt dem jeweiligen Bestand; Bilder lassen sich bei der Bearbeitung wiederverwenden, hochladen oder aufnehmen.
- **Team**: Personen, Vereine & Partner sowie für die Administration Zugänge, „Wer darf was?“ und Einstellungen. Berechtigungen bleiben serverseitig durchgesetzt.
- **Abend betreuen**: Eigener Live-Einstieg. Wer ausdrücklich zugeordnet und berechtigt ist, kann ein Stationsfoto für den laufenden Abend aktualisieren. Die Abendleitung kann dies ebenfalls.

## Freigaben und Rückwärtskompatibilität

Bestehende Inhalte werden beim Lesen ergänzt und erst bei einer bewussten Speicherung im erweiterten Format abgelegt. Es gibt keine automatische Neuanlage oder Migration von Inhalten. Vorlagen und Import erzeugen keine Freigabe. Die Veröffentlichung übernimmt die geprüfte Auswahl und die Angaben zum Abend als eigene Fassung. Bereits bestehende Freigaben ohne Metadaten-Schnappschuss bleiben lesbar.

Der Abschlussassistent trennt „Vorbereitung speichern“, „Änderungen für Gäste übernehmen“ und „Gäste-App öffnen“. Änderungen seit dem Abschlusscheck verlangen eine erneute Prüfung. Ein geschlossener Abend bleibt geschlossen, wenn nur seine Fassung übernommen wird.

CSV-Importe bieten Spaltenzuordnung, Zeilenvorschau, Fehlerliste, Aktualisierung über Kennung und Schutz vor doppelter Übernahme. Eine Übernahme erfolgt nur für eine vollständig geprüfte Datei. Maximal 500 Zeilen und 1 MB; die exportierte Datei enthält Bildadressen, keine Bilddateien.

Die Bilderübersicht zeigt bis zu 500 zuletzt gespeicherte Bilder pro Bestand. Kameraaufnahme benutzt die Kamerafunktion des Browsers; ein physischer iPhone-Kameratest bleibt zur Abnahme sinnvoll. In dieser Iteration sind keine echten E-Mails versendet, Konten angelegt oder Veranstaltungen veröffentlicht worden.

## Validierung dieser Iteration

79 automatisierte Prüfungen erfolgreich. Zusätzliche Worker-Prüfungen für persönliche Passwörter, Mailbox-Verschlüsselung und verschlüsselten Push-Versand erfolgreich. Isolierter Browser: eigene Speisenkategorie und Inhalt, CSV-Datei inklusive Zuordnung und Vorschau, undatierter Abend, Vorlage aus einem Abend, Bearbeitung einer Vorlage, Freigabecheck mit fehlenden Angaben, Öffnen und Aktualisieren einer lokalen Gäste-App sowie lokaler Bildupload und Stationsfoto. Die Arbeitsumgebung wird nur lesend geprüft. Mobile Darstellung bei 390 Pixeln ohne seitlichen Seitenüberlauf geprüft.
