# Stellar Frontier – Development Backlog

**Version:** 0.2
**Status:** P1-Energie-/Physikkern, Editor, SF-070 bis SF-093 und SF-191-Lastprofil umgesetzt; Gate-C-Playthrough bestanden, Zielhardware und mobiles Gate A bleiben offen

Dies ist der verbindliche Backlog. Task-IDs, Prioritäten, Abhängigkeiten und Akzeptanzkriterien werden hier gepflegt. `Priorisierung.md` beschreibt den kritischen Pfad, `Implementierungsplan.md` die technische Umsetzung und `SKALIERUNG.md` die Benchmarkprofile.

## Prioritätsskala

| Priorität | Bedeutung |
| --- | --- |
| P0 | Architekturkritisch |
| P1 | Kernsimulation |
| P2 | MVP-Gameplay |
| P3 | Open World |
| P4 | Endgame und Content |

## EPIC-001 – Projektgrundgerüst

### SF-001 – Repositorystruktur anlegen

- **Priorität:** P0
- **Abhängigkeiten:** Keine
- **Akzeptanzkriterien:**
  - `src/core` für gemeinsame Typen, Konfiguration und Koordinaten
  - `src/world` für Chunks und Weltzugriff
  - `src/construction` für Konstruktionen und Fragmentierung
  - `src/save` für versionierte Persistenz
  - `src/rendering` und `src/ui` getrennt halten
  - `tests` für automatisierte Tests
  - Feature-Verzeichnisse wie `src/combat` erst mit der jeweiligen Implementierung anlegen

### SF-002 – Buildpipeline einrichten

- **Priorität:** P0
- **Abhängigkeiten:** SF-001
- **Akzeptanzkriterien:**
  - Build erfolgreich
  - Linter konfiguriert
  - Testframework integriert

### SF-003 – Globales Konfigurationssystem

- **Priorität:** P0
- **Abhängigkeiten:** SF-001
- **Akzeptanzkriterien:**
  - `CHUNK_SIZE` zentral auf 32 Tiles festgelegt
  - Ungeklärte Weltgröße und aktiver Radius nicht mit vorläufigen Werten vortäuschen
  - Weitere Konstanten erst nach einer dokumentierten Architekturentscheidung ergänzen

## EPIC-002 – Tilesystem

### SF-010 – Tile-Datenmodell implementieren

- **Priorität:** P0
- **Abhängigkeiten:** SF-002
- **Akzeptanzkriterien:**
  - HP
  - Armor
  - Mass
  - ResourceCost

### SF-011 – Tile Registry erstellen

- **Priorität:** P0
- **Abhängigkeiten:** SF-010
- **Akzeptanzkriterien:**
  - Hull
  - Armor
  - Reactor
  - Battery
  - Thruster
  - Laden über eine Datenstruktur

### SF-012 – Tile-Platzierung implementieren

- **Priorität:** P0
- **Abhängigkeiten:** SF-011
- **Akzeptanzkriterien:**
  - Platzieren
  - Entfernen
  - Ersetzen

## EPIC-003 – Chunking

### SF-020 – Chunk-Datenstruktur

- **Priorität:** P0
- **Abhängigkeiten:** SF-012
- **Akzeptanzkriterien:**
  - 32 × 32 Tiles pro Chunk

### SF-021 – Chunk-Lookup-System

- **Priorität:** P0
- **Abhängigkeiten:** SF-020
- **Akzeptanzkriterien:**
  - Weltkoordinate → Chunk
  - Tilekoordinate → Chunk

### SF-022 – Chunk-Grenzübergänge

- **Priorität:** P0
- **Abhängigkeiten:** SF-021
- **Akzeptanzkriterien:**
  - Korrekte Nachbarchunks
  - Übergänge getestet

## EPIC-004 – Konstruktionen

### SF-030 – Construction Entity

- **Priorität:** P0
- **Abhängigkeiten:** SF-022
- **Akzeptanzkriterien:**
  - Chunksammlung
  - Eindeutige ID
  - Serialisierbar

### SF-031 – Flood-Fill-Zusammenhangsprüfung

- **Priorität:** P0
- **Abhängigkeiten:** SF-030
- **Akzeptanzkriterien:**
  - Verbundene Tiles erkennen
  - Isolierte Segmente erkennen

### SF-032 – Fragmentierungssystem

- **Priorität:** P0
- **Abhängigkeiten:** SF-031
- **Akzeptanzkriterien:**
  - Neue Konstruktionen entstehen
  - Fragmente erhalten eigene IDs

## GATE-A – Freigabe für P1

**Voraussetzungen:** SF-001 bis SF-032.

**Benchmarks:**

- 10.000 Tiles
- 100 Chunks
- Speichern und Laden
- 60 FPS auf Zielhardware

P1 wird erst nach Bestehen freigegeben.

Für die P1-Entwicklung gilt vorläufig die lokale Produktionsmessung als Desktop-Entwicklungsbaseline. Sie erfüllt das in [SKALIERUNG.md](./SKALIERUNG.md) festgelegte Wiederholungsprofil; das finale mobile Zielgerät ist damit nicht freigegeben.

## EPIC-005 – Editor

### SF-040 – Baumodus

- **Priorität:** P1
- **Abhängigkeiten:** GATE-A

### SF-041 – Mehrfachplatzierung

- **Priorität:** P1
- **Abhängigkeiten:** SF-040
- **Akzeptanzkriterien:**
  - Linien als viererverbundene Pfade zwischen Endpunkten platzieren
  - Gefüllte, inklusive Rechtecke per Pointer-Drag platzieren
  - Shape-Berechnung unabhängig testbar halten

### SF-042 – Blueprint-Speicherung

- **Priorität:** P1
- **Abhängigkeiten:** SF-040
- **Akzeptanzkriterien:**
  - Konstruktionen als versionierte JSON-Datei exportieren
  - Blueprint-Datei importieren und validieren
  - IDs, Tile-HP, Koordinaten und Thruster-Ausrichtung erhalten
  - Version-1-Dateien mit Standardausrichtung migrieren

## EPIC-006 – Energiesystem

### SF-050 – Energieerzeugung

- **Priorität:** P1
- **Abhängigkeiten:** GATE-A
- **Akzeptanzkriterien:**
  - Generatorleistung datengetrieben aus der Tile-Registry lesen
  - Summen pro Chunk und Konstruktion berechnen
  - Zerstörte Generatoren liefern keine Leistung
  - Aggregation nur bei Bedarf neu berechnen, nicht als Tile-Simulation pro Frame

### SF-051 – Energieverbrauch

- **Priorität:** P1
- **Abhängigkeiten:** SF-050
- **Akzeptanzkriterien:**
  - Verbraucherleistung datengetrieben aus der Tile-Registry lesen
  - Verbrauch pro Chunk und Konstruktion aggregieren
  - Zerstörte Verbraucher nicht mehr berücksichtigen
  - Erzeugung und Verbrauch in einem Aggregationslauf auswerten

### SF-052 – Energienetzwerk

- **Priorität:** P1
- **Abhängigkeiten:** SF-051
- **Akzeptanzkriterien:**
  - Nettoleistung pro Chunk und Konstruktion berechnen
  - Defizite bleiben lokal im jeweiligen Chunk
  - Keine Energieübertragung zwischen Chunks ohne explizite Netzwerkverbindung

### SF-053 – Prioritätensystem

- **Priorität:** P1
- **Abhängigkeiten:** SF-052
- **Reihenfolge:**
  1. Lebenserhaltung
  2. Antrieb
  3. Schilde
  4. Waffen
  5. Industrie
  6. Komfort
- **Akzeptanzkriterien:**
  - Höhere Prioritäten werden vor niedrigeren versorgt
  - Bei knapper Leistung wird die verbleibende Leistung innerhalb derselben Priorität proportional verteilt
  - Ergebnis ist deterministisch
  - Antriebsverbraucher erhalten die Priorität `propulsion`
  - Konkrete Zuordnung weiterer Spielmodule zu Prioritäten wird bei deren Implementierung explizit festgelegt

## EPIC-007 – Physik

### SF-060 – Massenberechnung

- **Priorität:** P1
- **Abhängigkeiten:** SF-030
- **Akzeptanzkriterien:**
  - Lebende Tiles anhand ihrer Registry-Masse zusammenfassen
  - Summen pro Chunk und Konstruktion ausgeben
  - Zerstörte Tiles nicht zur Masse zählen
  - Bei Änderungen neu berechnen, nicht als Tile-Simulation pro Frame

### SF-061 – Schwerpunktberechnung

- **Priorität:** P1
- **Abhängigkeiten:** SF-060
- **Akzeptanzkriterien:**
  - Schwerpunkt aus den Mittelpunkten lebender Tiles und deren Registry-Masse gewichten
  - Gesamtkonstruktion und Chunksummen reproduzierbar ausgeben
  - Leere bzw. masselose Konstruktionen ohne Schwerpunkt ausweisen

### SF-062 – Trägheitsberechnung

- **Priorität:** P1
- **Abhängigkeiten:** SF-061
- **Akzeptanzkriterien:**
  - Trägheitsmoment um die 2D-Drehachse durch den Schwerpunkt berechnen
  - Tiles als gleichmäßig verteilte Einheitsquadrate behandeln
  - Lebende Tile-Massen pro Chunk und Konstruktion aggregieren

### SF-063 – Thrustersystem

- **Priorität:** P1
- **Abhängigkeiten:**
  - SF-053
  - SF-062
- **Akzeptanzkriterien:**
  - Thruster können in vier Himmelsrichtungen ausgerichtet werden
  - Registry-Leistung und Chunk-Powerbudget bestimmen die angewendete Kraft
  - Kraftvektor und Drehmoment um den Schwerpunkt berechnen
  - Rigid-Body-Zustand mit Zeitschritt integrieren
  - Layout, Masseigenschaften und Powerbudget bei Änderungen aktualisieren und pro Zeitschritt wiederverwenden
  - Save-Version 1 ohne Orientierung verlustfrei nach Norden migrieren

## GATE-B – Freigabe für P2

**Voraussetzungen:** SF-040 bis SF-063.

**Benchmarks:**

- 1000-Tile-Schiff
- Schwerpunkt korrekt
- Energie korrekt
- Flugmodell stabil

## EPIC-008 – Kampf

### SF-070 – Projektilsystem

- **Priorität:** P2
- **Abhängigkeiten:** GATE-B
- **Akzeptanzkriterien:**
  - Datengetriebene Profile für Laser, Kanone und Rakete unterstützen
  - Projektil mit eindeutiger ID, Besitzer, Startposition und geerbter Schiffsbewegung erzeugen
  - Bewegungen deterministisch pro Zeitschritt aktualisieren und Lebensdauer berücksichtigen
  - Vorherige und aktuelle Position sowie Schadens- und Radiusdaten für Kollisionstasks bereitstellen
  - Trefferprüfung und Tile-Schaden SF-071 bis SF-073 überlassen

### SF-071 – Broadphase-Kollision

- **Priorität:** P2
- **Abhängigkeiten:**
  - SF-020
  - SF-070
- **Akzeptanzkriterien:**
  - Welt-AABBs über ein räumliches 32er-Raster mit den Chunk-Koordinaten indizieren
  - Gesweepte Projektilgrenzen aus vorheriger und aktueller Position samt Radius abfragen
  - Selbsttreffer ausschließen, Mehrfachkandidaten deduplizieren und Ergebnisse deterministisch ordnen
  - Nur Kandidaten liefern; exakte Formprüfung und Schaden bleiben Folgeschritten vorbehalten

### SF-072 – Narrowphase-Kollision

- **Priorität:** P2
- **Abhängigkeiten:** SF-071
- **Akzeptanzkriterien:**
  - Gesweepte Kreis-Projektile gegen Welt-AABBs kontinuierlich prüfen
  - Frühesten Trefferzeitpunkt, Projektilposition und Kontaktpunkt liefern
  - Startüberlappungen, Nullradius und Eckkontakte korrekt behandeln
  - Treffer deterministisch ordnen, ohne Projektile oder Ziele zu verändern

### SF-073 – Lokales Schadensmodell

- **Priorität:** P2
- **Abhängigkeiten:** SF-072
- **Akzeptanzkriterien:**
  - Projektilschaden direkt auf die HP des getroffenen Tiles anwenden
  - Fehlende Trefferziele melden, ohne die Konstruktion zu verändern
  - Zerstörte Tiles aus Chunk und Konstruktion entfernen und Zähler aktualisieren
  - Verbleibende Komponenten mit der bestehenden Fragmentierungs-API ermitteln
  - Rüstungsmitigation und Sekundärschäden getrennt behandeln, solange keine Formel festgelegt ist

## EPIC-009 – Simulationsaktivierung

### SF-080 – Chunk-Zustände

- **Priorität:** P2
- **Abhängigkeiten:** SF-020
- **Statuswerte:**
  - Dormant
  - Active
  - Combat
- **Akzeptanzkriterien:**
  - Neue Chunks beginnen im flüchtigen Zustand `dormant`
  - Zustände über die Konstruktion abfragen und für existierende Chunks ändern
  - Fragmentierung übernimmt den Laufzeitzustand der jeweiligen Quell-Chunks
  - Speichern und Laden setzen den nicht-persistierten Laufzeitzustand zurück auf `dormant`

### SF-081 – Ereignisgesteuerte Aktivierung

- **Priorität:** P2
- **Abhängigkeiten:**
  - SF-080
  - SF-073
- **Akzeptanzkriterien:**
  - Nähe-Ereignisse dormant-Chunks auf `active` setzen
  - Gültige Projektiltreffer den betroffenen Chunk auf `combat` hochstufen
  - Niedrigere Aktivierungsereignisse den Combat-Zustand nicht zurückstufen
  - Fehlende Chunks und ungültige Ereignisse explizit melden
  - Verfehlte oder bereits entfernte Ziele nicht aktivieren

### SF-082 – Zeitgesteuerte Deaktivierung

- **Priorität:** P2
- **Abhängigkeiten:** SF-081
- **Akzeptanzkriterien:**
  - Aktive und Combat-Timeouts als positive Policy-Werte entgegennehmen
  - Nach Combat-Inaktivität zu `active`, danach zu `dormant` zurückstufen
  - Ausschließlich deterministische Simulationszeit statt Wandzeit verwenden
  - Überschüssige Zeit großer Zeitschritte auf nachfolgende Zustände übertragen
  - Zustandswechsel pro Schritt stabil nach Chunk-Koordinaten melden

## EPIC-010 – Mining

### SF-090 – Asteroidenobjekte

- **Priorität:** P2
- **Abhängigkeiten:** SF-073
- **Akzeptanzkriterien:**
  - Asteroid mit ID, rigid-body Zustand und nichtleerer Tile-Konstruktion erstellen
  - Asteroidenmaterial als `rock`-Tiles in der bestehenden Chunk-Struktur speichern
  - Ressourcenart und -menge pro Tile validiert hinterlegen
  - Doppelte Tile-Positionen sowie ungültige Zustände und Ressourcenmengen ablehnen

### SF-091 – Mining-Laser

- **Priorität:** P2
- **Abhängigkeiten:** SF-090
- **Akzeptanzkriterien:**
  - Laserprofil mit Reichweite, Schadensrate und Leistungsbedarf validieren
  - Weltstrahl in lokale Asteroidenkoordinaten transformieren und Chunk-Abfrage nutzen
  - Nächstes getroffenes Tile auswählen und Teilenergie proportional auf Schaden anwenden
  - Treffer über das lokale Schadensmodell verarbeiten und Chunk aktivieren
  - Fehlende Leistung und Fehlschüsse ohne Tile-Änderung melden

### SF-092 – Ressourcenloot

- **Priorität:** P2
- **Abhängigkeiten:** SF-091
- **Akzeptanzkriterien:**
  - Zerstörte Asteroiden-Tiles geben ihre Ressourcenablagerung genau einmal frei
  - Fehlschüsse und überlebende Tiles erzeugen keinen Loot
  - Inventare sammeln Drops dedupliziert und summieren Mengen pro Ressourcentyp
  - Ungültige IDs, Ressourcentypen, Mengen und Summenüberläufe explizit ablehnen

### SF-093 – Gate-C-Missionsintegration

- **Priorität:** P2
- **Abhängigkeiten:** SF-070 bis SF-092
- **Akzeptanzkriterien:**
  - Editor-Konstruktion als Spielerschiff mit Energie- und Thruster-Zeitschritten verwenden
  - Projektilkampf gegen eine Tile-Konstruktion über Broadphase, Narrowphase und lokalen Schaden ausführen
  - Mining-Laser, Drop-Erzeugung und Inventaraufnahme als durchgängige Mission verbinden
  - Versionierter Missionsspeicher umfasst Schiff, Flugzustand, Gegner, Asteroid, Inventar und offene Drops
  - Automatisierter Integrationstest deckt Bauen, Fliegen, Kämpfen, Abbauen, Einsammeln und Speichern/Laden ab

## GATE-C – MVP

**Voraussetzungen:** SF-070 bis SF-093.

**Status:** Lokaler Browser-Playthrough aller MVP-Schritte bestanden; die mobile Gate-A-Freigabe bleibt separat offen.

**MVP-Anforderungen:**

- Schiff bauen
- Schiff fliegen
- Asteroid abbauen
- Kampf gegen Gegner
- Speichern und Laden

## EPIC-011 – Galaxie

### SF-100 – Sektor-Datenmodell

- **Priorität:** P3
- **Abhängigkeiten:** GATE-C

### SF-101 – Ringbasierter Weltgenerator

- **Priorität:** P3
- **Abhängigkeiten:** SF-100

### SF-102 – Distanzabhängige Schwierigkeit

- **Priorität:** P3
- **Abhängigkeiten:** SF-101

## EPIC-012 – Streaming

### SF-110 – Sektor-Ladesystem

- **Priorität:** P3
- **Abhängigkeiten:** SF-101

### SF-111 – Sektor-Entladung

- **Priorität:** P3
- **Abhängigkeiten:** SF-110

### SF-112 – Hintergrundsimulation

- **Priorität:** P3
- **Abhängigkeiten:** SF-111

## EPIC-013 – Stationen

### SF-120 – Stationen aus Construction ableiten

- **Priorität:** P3
- **Abhängigkeiten:** SF-112

### SF-121 – Dockingsystem

- **Priorität:** P3
- **Abhängigkeiten:** SF-120

### SF-122 – Ressourcenübergabe

- **Priorität:** P3
- **Abhängigkeiten:** SF-121

## GATE-D – Streaming-Nachweis

**Benchmarks:**

- Streaming aktiv
- Speicher stabil
- Kein FPS-Abfall
- Wechsel zwischen Sektoren möglich

## EPIC-014 – Industrie

### SF-130 – Rezeptsystem

- **Priorität:** P4
- **Abhängigkeiten:** GATE-D

### SF-131 – Produktionsmodule

- **Priorität:** P4
- **Abhängigkeiten:** SF-130

### SF-132 – Produktionswarteschlangen

- **Priorität:** P4
- **Abhängigkeiten:** SF-131

## EPIC-015 – Forschung

### SF-140 – Forschungssystem

- **Priorität:** P4
- **Abhängigkeiten:** SF-132

### SF-141 – Technologiebaum

- **Priorität:** P4
- **Abhängigkeiten:** SF-140

## EPIC-016 – KI

### SF-150 – NPC-Schiffsgenerator

- **Priorität:** P4
- **Abhängigkeiten:** SF-141

### SF-151 – Navigations-KI

- **Priorität:** P4
- **Abhängigkeiten:** SF-150

### SF-152 – Kampf-KI

- **Priorität:** P4
- **Abhängigkeiten:**
  - SF-151
  - SF-073

## EPIC-017 – Fraktionen

### SF-160 – Fraktionssystem

- **Priorität:** P4
- **Abhängigkeiten:** SF-152

### SF-161 – Diplomatie

- **Priorität:** P4
- **Abhängigkeiten:** SF-160

### SF-162 – Wirtschaftliche Fraktionssimulation

- **Priorität:** P4
- **Abhängigkeiten:** SF-161

## EPIC-018 – Flotten

### SF-170 – Flottenverwaltung

- **Priorität:** P4
- **Abhängigkeiten:** SF-152

### SF-171 – Rollenbasierte Formationen

- **Priorität:** P4
- **Abhängigkeiten:** SF-170

### SF-172 – Großschlachten

- **Priorität:** P4
- **Abhängigkeiten:** SF-171

## EPIC-019 – Endgame

### SF-180 – Megastrukturen

- **Priorität:** P4
- **Abhängigkeiten:**
  - SF-162
  - SF-172

### SF-181 – Galaktische Krisen

- **Priorität:** P4
- **Abhängigkeiten:** SF-180

### SF-182 – Siegbedingungen

- **Priorität:** P4
- **Abhängigkeiten:** SF-181

## EPIC-020 – Skalierung und Profiling

Die Benchmarks ergänzen die funktionalen Gates. Sie ersetzen keine Tests und dürfen nicht als bestanden markiert werden, bevor sie auf der festgelegten Zielhardware gemessen wurden.

### SF-190 – Gate-A-Skalierungstest

- **Priorität:** P0
- **Abhängigkeiten:** SF-032
- **Akzeptanzkriterien:**
  - 10.000 Tiles in mindestens 100 Chunks erzeugen
  - Konstruktion speichern und verlustfrei laden
  - Framerate auf der Zielhardware messen und dokumentieren

### SF-191 – 3000-Tile-Schiff testen

- **Priorität:** P2
- **Abhängigkeiten:** SF-073
- **Status:** Sechs lokale Produktionsläufe dokumentiert; Zielhardware nicht bestätigt
- **Akzeptanzkriterien:**
  - 3000 Tiles unter aktivierter Kampf- und Schadenssimulation testen
  - Framerate und Speicherverbrauch dokumentieren

### SF-192 – Stationslast testen

- **Priorität:** P3
- **Abhängigkeiten:** SF-120
- **Akzeptanzkriterien:**
  - Zehn Stationen mit jeweils 10.000 Tiles testen
  - Framerate und Speicherverbrauch dokumentieren

### SF-193 – NPC-Flottenlast testen

- **Priorität:** P4
- **Abhängigkeiten:** SF-152
- **Akzeptanzkriterien:**
  - 100 NPC-Schiffe gleichzeitig simulieren
  - Framerate und CPU-Verbrauch dokumentieren

### SF-194 – Profiling-Bericht erstellen

- **Priorität:** P0
- **Abhängigkeiten:** SF-002
- **Akzeptanzkriterien:**
  - CPU, RAM, Chunk-Aktivität, Physik, Kollision und Speichersystem erfassen oder ausdrücklich als nicht verfügbar/nicht implementiert kennzeichnen
  - Nicht verfügbare Messwerte niemals als bestanden darstellen
  - Ergebnisse nach jedem Gate unter identischen Bedingungen vergleichbar festhalten

## Agentenregeln

- **RULE-001:** Keine Entwicklung oberhalb der aktuellen Prioritätsstufe.
- **RULE-002:** Jede Epic endet mit Benchmarks.
- **RULE-003:** Tile-Simulation nur bei aktiven Ereignissen.
- **RULE-004:** Neue Mechaniken müssen chunk-kompatibel sein.
- **RULE-005:** Performance-Regression blockiert Merge.
- **RULE-006:** Ein funktionierender Spielstand hat Vorrang vor neuem Content.
- **RULE-007:** Open World erst nach funktionierendem Gameplay-Core.
- **RULE-008:** Weltgröße darf wachsen, die aktive Simulation nicht.
