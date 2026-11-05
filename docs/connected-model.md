# Zentrale Definitionen, Beziehungen und Freigaben

Diese Implementierung ergänzt die vorhandenen Daten. Sie verändert weder eine
veröffentlichte Gästefassung noch Anfragen, Konten oder Push-Abos beim Lesen.

## Führende Daten und Kennungen

Bestehende Inhalte bleiben unter ihrer bisherigen Katalogkennung führend,
Personen unter personId. Die Beziehungsreferenz besteht aus Art und Kennung,
beispielsweise games/poker. Menü verweist auf den bisherigen drinks-Bestand.
Namen sind keine Identitäten. Ein Funktionscode bezeichnet eine implementierte
Softwarefähigkeit; ein frei benannter Inhalt erzeugt keine neue Softwarefunktion.

Stände, Aufgaben und Bestände sind einzelne rudelResource-Dokumente, Beziehungen
einzelne rudelRelationship-Dokumente. Ein gemeinsamer Revisionsanker schützt eine
Transaktion über mehrere Objekte. Quellenrevisionen schützen gegen veraltete
Bearbeitungen der Inhalte und Personen. Es gibt keine automatische Publikation.
Nicht mehr benötigte Beziehungen werden zunächst archiviert, nicht heimlich entfernt.

## Konkrete Durchführung

Jede offers-Beziehung besitzt eine eigene Kennung. Derselbe Inhalt kann an
mehreren Ständen oder mehrfach an einem Stand stattfinden. Beschreibung und
Bilder bleiben zentral; standbezogene Werte und ausdrückliche Abendabweichungen
besitzen eine nachvollziehbare Herkunft. Explizit leer ist verschieden von geerbt.

Betreuung wird aus benötigter Aufgabe und ihrer Besetzung aufgelöst. Allgemeine
Besetzung gilt als Vorgabe; inhaltsbezogene, stand-/funktionsbezogene und konkrete
Zuordnung sind spezifischer. Gleichrangige widersprüchliche Besetzung ist ein
Konflikt. Abendabweichungen gelten nur für die ausgewählte Durchführung.
Bewusst unbetreut stoppt Vererbung; unbesetzte Pflichtbetreuung verhindert Freigabe.
Aufgaben und öffentliche Kontakte vergeben keine technischen Berechtigungen.

Bestände werden über überschneidende Zeitfenster geprüft. Ein archiviertes
benötigtes Objekt oder eine noch nicht implementierte Funktion blockiert die
Freigabe der betroffenen Auswahl. Ein Speichern der Vorbereitung bleibt möglich.

## Messvertrag

shared/measurements.mjs definiert versionierte Ereignisse und Begriffe. Der
Browser kann Bedienereignisse melden, niemals selbst Teilnahme, Gewinn oder
Dating-Aktivierung bestätigen. Bedienmessung verlangt freiwillige Zustimmung.
Serverereignisse entstehen aus berechtigten Fachaktionen und werden später
transaktional mit deren Änderung gespeichert.

Ein Messereignis enthält ausschließlich freigegebene Kennungen und feste Codes.
Freitexte, Profileigenschaften, URLs, Zugangsschlüssel, Suchwünsche und private
Nachrichten sind keine Analysefelder. Messzeit und Teilnahme stammen vom Server.
Zusätzliche Tracking-Cookies oder Fingerprinting sind nicht vorgesehen.
