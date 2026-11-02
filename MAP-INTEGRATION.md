# Interaktive Dorfkarte

Freigegebene Übergabe: 2026-11-02, Kartenkonzept-Chat. Lokale Referenzen unter `/Users/christopher.harms/Documents/Codex/2026-11-02/okay-start-f-r-eine-neue/outputs/rudelbar-map-uebergabe`. Referenzbeispiele sind keine Arbeitsdaten.

## Vereinbarter Umfang

- Additive, optionale Karte in Vorlagen, Abendvorbereitung, Vorschau und ausdrücklicher Freigabe.
- Wiederverwendbare Ortspläne; physische Kartenstände mit mehreren bestehenden Angeboten; operative Stationen bleiben getrennt.
- Festes Weltkoordinatensystem; proportionale Kamera für Desktop und mobile Gästeansicht, Zoom und Verschieben ohne Geometriestreckung.
- Desktop-Editor: Wege und Flächen zeichnen; Punkte, Kurven, Größe, Winkel und Position nachträglich bearbeiten; Dorfobjekte, Hintergründe, Orientierung und vorhandene Bilder/Personen.
- Mobile Karte mit Standfenstern, mehreren passenden Aktionen und alternativer Liste.
- Spielrunden als eigener wirklicher Ablauf, falls im Bestand nicht vorhanden; keine scheinbar funktionierende Demoaktion.
- Berechtigungen, Entwürfe und Freigaben erhalten. Keine Beispieldaten in die Arbeitsumgebung. Bestehender Zugang Redaktion und unabhängiger Notfalleditor bleiben erhalten.

## Modell und Prüfungen

Ein Ortsplan ist eine eigenständige private Vorlage für die Geometrie. Die Abendfassung übernimmt eine Kopie, Änderungen an einem Ortsplan überschreiben keine Vorbereitung oder Freigabe. Angebots-, Personen- und Stationszuordnungen gehören zur Abendkarte. Ein Stand ist keine neue operative Station und vergibt keine Rechte.

Eine Welt hat eine feste Breite und Höhe. Formen speichern Position, Größe und Drehung sowie lokale Punkte mit relativen Kurvengriffen. Die Kamera verwendet einen einzigen Skalierungsfaktor für beide Achsen; lesbare Schilder und große Trefferflächen liegen darüber.

Schreibtests ausschließlich isoliert. Geometrie, Validierung, dynamische Verweise, Mehrfachangebote, Rollen, private Abende, Freigabengrenze, Wiederholung und Versionskonflikte automatisiert prüfen. Browser: Desktop-Editor sowie 320/390/größere Handybreite/Querformat. Physische iPhone-/Android-Abnahme separat offen halten.

## Bedienung

- Unter **Abende → Ortspläne** eine Gestaltung anlegen, zeichnen und speichern. Sie beginnt leer; es werden keine Beispielstände angelegt.
- In einer **Vorlage oder Abendvorbereitung → Dorfkarte** den Ortsplan übernehmen oder eine eigene Gestaltung beginnen. Angebote zuerst unter **Inhalte & Ansicht** auswählen, Personen im **Team** ergänzen, Kontakte und Anmeldungen als **Stationen** vorbereiten.
- Am Kartenstand mehrere ausgewählte Inhalte, optionale Betreuung und passende Kontakte zuordnen. Eine gemeinsame Position verbindet keine Berechtigungen oder Warteschlangen. Die Personenkennungen und Bilder stammen aus der vorhandenen Verwaltung.
- Die Karte bei den Einstellungen der Zeichenfläche einschalten. **Als Entwurf speichern** ändert die Gästeansicht nicht. Erst **Prüfen & freigeben** übernimmt die neue Fassung; der bestehende Offen-/Geschlossen-Status bleibt maßgeblich.
- Bei einer Aktivität mit mindestens zwei Plätzen können Spielrunden eingeschaltet werden. Gäste eröffnen, finden, betreten und verlassen Runden. Leitung bzw. zuständiges Live-Team startet oder beendet sie. Anmeldungen verwenden bestehende Gastsitzungen, keine weiteren Konten.
- Die Gäste behalten eine alternative Angebotsliste. Der Zeicheneditor ist für Laptop/Desktop vorgesehen; die Gästeansicht für Handys.

## Grenzen und Betrieb

Eine Karte umfasst höchstens 50 Stände, 160 Dorfobjekte/Formen und 2.000 Formpunkte. Es ist eine Orientierungsskizze ohne vermessenen Metermaßstab. Eine bearbeitete Ortsplanvorlage ändert keine bestehenden Abendkopien. Ausgeblendete Inhaltsbereiche bleiben auch in Kartenangeboten ausgeblendet.

Spielrunden aktualisieren sich bei geöffnetem Fenster alle fünf Sekunden. Push für Spielrunden ist noch nicht angebunden; die bestehenden Nachrichten-, DJ- und Karaoke-Mitteilungen bleiben erhalten. Es gibt keine Offline-Versandwarteschlange. Die Abnahme auf einem physischen iPhone und Android-Gerät steht noch aus; Browsergrößenprüfung ist kein Gerätetest.

Migration `0007_game_rounds.sql` ergänzt ausschließlich zwei Tabellen mit Indizes. Eine Rückkehr zur vorherigen Worker-Version lässt vorhandene Inhalte und die neuen Tabellen unangetastet. Keine Zugangsdaten, DNS-Einstellungen, Abonnements oder bestehenden Freigaben werden dafür geändert.

## Prüfung vor Veröffentlichung

94 automatisierte Tests bestehen, einschließlich Geometrie, öffentlicher Projektion, getrennten Stationsrechten, privaten Abenden, Freigabegrenzen, Versionskonflikten, atomarer Platzvergabe und wiederholten Anmeldungen. Cloudflare-Laufzeitprüfungen für Passwortschutz, Mailverschlüsselung und Push bestehen. Beide Worker-Pakete lassen sich bauen.

Isolierte Browserprüfung: Ortsplan anlegen/speichern/laden, in Abend übernehmen, Weg und Fläche zeichnen, Kurve und Griff bearbeiten, Position/Größe/Drehung ändern, Ebenen sowie Rückgängig/Wiederholen; ausdrückliche Freigabe/Öffnen/Schließen; gemeinsame Musikposition mit getrennten echten DJ-/Karaoke-Testeingängen; zwei Gastsitzungen in einer Spielrunde samt Live-Betreuung, Verlassen, Versionskonflikt und Beenden. Lange Standnamen, alternative Liste, Zurück/Fokus und erhaltene Kamera geprüft. Gästeansichten bei 320, 390, 430 sowie 844×390 Pixeln; keine horizontale Seitenüberbreite. Alle Schreibtests ausschließlich lokal, kein Versand an echte Personen.

## Online-Nachweis

Veröffentlicht am 2. November 2026 auf den bestehenden Workern. CMS-Version `e13403d2-5256-42d6-a0f9-cc0d549a7288`, Gäste-Version `830216a0-4c65-4a98-b239-6c54d14a63db`. Migration 0007 wurde erfolgreich angewendet.

41 Online-Prüfungen bestätigen die veröffentlichten Dateien, geschützten Zugänge und unveränderten Inhaltsversionen. Alle 30 Website- und 41 App-Dokumente behalten ihre Revisionen. Der Live-Bestand bleibt bei 1 Konto, 3 Gästen, 5 Anfragen, 1 Push-Abonnement und 0 Stationsfotos; die beiden neuen Rundentabellen sind leer. Die Online-Ortsplanliste ist leer, bestehende Webseitenbeiträge und Notfallredaktion sind erreichbar. Die Beispielkarte und alle Testanfragen existierten ausschließlich im lokalen Prüfsystem. Details: `MAP-INTEGRATION-VERIFICATION.json`.
