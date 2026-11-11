# Mein Profil und gemeinsamer Gastzugang · 11. November 2026

## Veröffentlicht

Quelle `d83a495a66f4e36064ee5c397c993a42d3fe9e51`, identischer lokal und auf GitHub gesicherter Quellbaum `0c64a7550454a40620e0ab8b58930ad7a18077c5`.

- Backstage/Live: `2e52e7b5-2611-4b25-8aa7-ed4c04df8eb2`.
- Gäste-App: `b686b404-884e-4b60-bf7b-827647516459`.
- 32 ausgelieferte Gäste-, Vorschau- und gemeinsam genutzte Dateien per SHA-256 mit den geprüften Quellen abgeglichen.
- Alle abgefragten Worker-Bindungen vor/nach dem Release identisch; Minuten-Zeitplan erhalten. Keine Migration und kein Inhalts- oder Konten-Reset.
- Öffentliche Website unverändert auf `c5178a1b099fad1d7baee4013921d891925b1038`.

## Verhalten

„Mein Profil“ steht im Gäste-Header neben der Glocke und bündelt den bestätigten Anmeldestatus, eigene Angaben, optionale Begegnungsangaben, Mitteilungseinrichtung, Datenschutz-/Freigabeverwaltung und optionale bestätigte Kontakte. „Mein Abend“ bleibt der Merkzettel; ein zusätzlicher Verweis führt ins Profil. Die freigegebene Navigationsentscheidung ist als A11 im App-Brand-Nachtrag dokumentiert.

Die App prüft den bestehenden Gastzugang am Backend. Ein lokal gespeicherter Vorname allein gilt nicht als Anmeldung. Bloßes Aufrufen des Profils legt weder eine Identität noch eine Freigabe an. Die Namenseingabe erstellt oder erneuert einen Gastzugang nur nach ausdrücklichem Absenden. Die authentifizierte Redaktion-Vorschau bleibt lokal und schreibt keine Gästedaten.

Fehlender Gastzugang wird mit dem gemeinsamen roten Fehlerhinweis und „Erneut anmelden“ dargestellt. Alle bestehenden Gastmodule verwenden denselben Anmeldeweg; auch Stationseingänge, Postfach, Rundengespräche und Mitteilungseinstellungen erhalten den konkreten Fehlerhinweis. Anmeldeabbrüche bleiben wiederholbar. Netzwerkfehler werden nicht als fehlende Anmeldung ausgegeben.

Die Wall behält beim Wiederanmelden im selben geöffneten Dialog Foto, Text und gewählte Freigaben. Sie sendet anschließend nicht automatisch. Ein erneuter eigener Klick reicht den erhaltenen Entwurf ein. Auch ungespeicherte Profilangaben bleiben beim Wiederanmelden im geöffneten Editor erhalten. Ein neuer Gastzugang beansprucht keine früheren Beiträge über die Namensgleichheit. Ein vollständiger Seiten-Reload speichert ungesendete Entwürfe weiterhin nicht dauerhaft.

Unter Datenschutz/Freigaben sind die vorhandenen Messungs-, Wall- und Begegnungseinstellungen erreichbar. Diese Änderung führt keine pauschale Einwilligung oder neue Rechtsgrundlage ein und verändert keine vorhandenen Einwilligungsnachweise. Nach Abendschluss bleiben vorhandene Zugänge und Verwaltungswege lesbar; neue Gastzugänge werden nicht angeboten. Der getrennte dauerhafte Kontaktzugang bleibt unverändert.

## Prüfbelege und Grenzen

256 automatisierte Tests erfolgreich, einschließlich der Trennung zwischen gespeicherten Namen, bestehender Sitzung und ausdrücklicher Anmeldung. 26 JavaScript-Module und CSS ohne Syntaxfehler geprüft. Vollständiger isolierter Abend mit zwei fiktiven Gästen, getrennten Stationseingängen, Spielrunde, Wall, fiktiver Gewinnaktion, gegenseitiger Begegnung, betreuter Runde, Schließen und Auswertung erfolgreich.

Browser: frischer Profileinstieg ohne Namen, ausdrückliche Anmeldung, Profiländerung mit gespeichertem Ergebnis, Mitteilungswizard mit Hinweiston zuerst, keine iOS-Anleitung auf Desktop, Datenschutzzugriff ohne neue Zustimmung sowie geschlossener Abend ohne Neuanmeldung geprüft. Der kritische Wall-Ablauf wurde ausschließlich lokal mit tatsächlichem PNG-Foto vorbereitet: Zugang in zweitem Tab beendet, roter Fehler im ersten Tab, zentrale Wiederanmeldung, unveränderter Text/Foto/Freigabeauswahl, danach erfolgreicher Upload zur Moderation. Keine Fake-Beiträge oder Identitäten in den echten Diensten erzeugt.

320 und 390 px ohne horizontalen Überlauf in den geprüften Ansichten. Die veröffentlichte private App und das Profil wurden nur gelesen; der vorhandene Zugang wurde als angemeldet erkannt. Bitter und lokal ausgelieferte Source Sans 3 bestätigt. Das sind Browserprüfungen, keine echte iPhone-/Android-Abnahme. Die ursprüngliche Ursache des konkreten iPhone-Sitzungsverlusts bleibt weiterhin nicht abschließend nachgewiesen.

Geschützte Protokolle liegen lokal unter `.qa/profile-*`; Online-Screenshot und versionierte Changelog-PDF V1.4 liegen im Aufgabenordner. Vorherige PDF-Versionen bleiben erhalten.

## Getrennte offene Aufgaben

- Nachtrag: Goldschrift auf Goldfläche bei „Leinwand öffnen“ am 11. November separat korrigiert; aktueller Nachweis in `docs/CURRENT.md`.
- Kürzerer Wall-Teilen-Dialog mit deutlicher Bestätigung und Abschluss.
- Weitergehende zentrale Einwilligungsverwaltung über den jetzigen gemeinsamen Einstieg hinaus.
- Vollständiger gemeinsamer Live-Eingang einschließlich Wall-Moderation.
- Entfernen sichtbarer Testkennzeichnungen aus bestehenden Abendinhalten; diese wurden im vorliegenden Profilauftrag nicht verändert.
- Echte Geräteabnahme einschließlich Tastatur, Kamera/Mediathek und Push bleibt offen.

Die Profil-/Zugangsaufgabe aus der vorherigen Feedbackrunde ist mit dieser Fassung umgesetzt; die obigen Punkte wurden nicht nebenbei mitbearbeitet.

## Gezielter Rückweg

Vorheriger zusammengehöriger Stand: Backstage `8cb9b8fe-b44c-41ea-ad82-a60ba61bee50`, Gäste-App `13d2b20c-d8aa-4d0a-b105-c4f04a2eb805`, Quelle `6c0b9c52977bc73da0f5e1bcb9d21be7b0f32b4c`. Es gab während des Releases kurz die Backstage-Zwischenfassung `9b0e2fa4-49f6-4136-965c-86965961ce87`; der oben genannte Abschlussstand enthält zusätzlich die Klarstellung bei geschlossenen Abenden. Bei einer gezielten Code-Rücknahme beide Worker und ihre generierte Vorschau gemeinsam berücksichtigen. Daten, Rechte und Inhalte nicht zurücksetzen.
