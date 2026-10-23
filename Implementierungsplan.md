# Implementierungsplan für den VS-Code Agent Mode

**Projekt:** Stellar Frontier

Ziel dieses Plans ist, einem autonomen Coding-Agenten einen klaren Pfad vorzugeben, der technische Risiken früh reduziert und spätere Features nicht blockiert.

> Erst die Architektur, dann das Gameplay. Erst die Skalierbarkeit beweisen, dann die Inhalte bauen.

## Phase 0 – Technologisches Fundament

### Ziel

Nachweisen, dass die Kernarchitektur funktioniert.

- Kein Gameplay
- Keine Fraktionen
- Keine Forschung
- Nur Performance

### Aufgaben

#### ECS einführen

**Empfehlung:**

```text
Entity
Component
System
```

**Beispiel:**

```text
ShipEntity
TransformComponent
PowerComponent
TileGridComponent
PhysicsComponent
```

#### Tile-Grid

**Implementieren:**

```text
Tile
Chunk
Construction
```

```text
Tile
  ↓
Chunk (32 × 32)
  ↓
Construction
```

#### Chunk-System

**Vorgabe:** 32 × 32 Tiles pro Chunk.

Jeder Chunk besitzt:

```typescript
class Chunk {
  tiles: Tile[];
  active: boolean;
}
```

#### Save-System

Serialisierung testen. Folgende Größe muss ohne Framedrop gespeichert werden können:

```text
10.000 Tiles
100 Chunks
```

### Milestone 0

Erfolg, wenn:

- Konstruktion mit 10.000 Tiles in mindestens 100 Chunks erzeugbar
- Speichern und Laden dieser Konstruktion möglich
- 60 FPS auf Zielhardware

Die verbindliche Gate-A-Schwelle und der Benchmarkablauf stehen in [BACKLOG.md](./BACKLOG.md) und [SKALIERUNG.md](./SKALIERUNG.md).

## Phase 1 – Konstruktionen

### Ziel

Bauen und Bearbeiten von Konstruktionen. Noch keine Kämpfe.

### Tile-Typen

Erste Implementierung:

- Hull
- Armor
- Reactor
- Battery
- Thruster
- Storage

### Baumenü

**Funktionen:**

- Tile setzen
- Tile löschen
- Mehrfachplatzierung
- Copy/Paste

### Konstruktion validieren

Prüfen, ob die Konstruktion zusammenhängend ist:

```text
Zusammenhängend?
├─ Ja: gültig
└─ Nein: Fragmente erzeugen
```

### Fragment-System

**Beispiel:**

```text
Schiff trifft Asteroid
  ↓
Flügel wird abgerissen
  ↓
Neues Objekt erzeugen
```

Diese Logik wird später für den Kampf benötigt.

### Milestone 1

- Schiffsbau vollständig
- Fragmentbildung funktioniert
- Save/Load funktioniert

## Phase 2 – Energiesystem

### Ziel

Alle späteren Systeme benötigen Energie. Deshalb wird das Energiesystem früh implementiert.

### Komponenten

- Reactor
- Battery
- PowerConsumer

### Netzwerkmodell

Nicht pro Tile berechnen, da dies zu teuer wäre. Stattdessen auf Chunk-Ebene arbeiten.

**Berechnung:**

```text
Power Produced
- Power Consumed
= Net Power
```

### Prioritäten

Bei Strommangel:

1. Lebenserhaltung
2. Antrieb
3. Schilde
4. Waffen
5. Industrie
6. Komfort

### Milestone 2

- Energie fließt korrekt
- Stromausfälle möglich
- Großschiffe skalieren

## Phase 3 – Flug und Physik

### Ziel

Das Schiff bewegt sich.

### Berechnungen

Aus der Konstruktion berechnen:

- Gesamtmasse
- Schwerpunkt
- Trägheitsmoment
- Schub

**Physikmodell:**

```text
2D Newtonian Light
```

Keine vollständige Orbitalmechanik.

### Triebwerke

Jedes Triebwerk besitzt:

- Leistung
- Rotationseinfluss
- Energiekosten

Die Ausrichtung ist zunächst auf die vier Himmelsrichtungen begrenzt. Die Kraft wirkt entlang der Ausrichtung; der visuelle Renderer zeigt diese Richtung an.

### Milestone 3

- Freiflug
- Rotation
- Schwerpunkt beeinflusst das Verhalten

## Phase 4 – Schadensmodell

### Ziel

Das Schadensmodell ist ein Kernfeature.

### Projektilsystem

Laser, Kanone und Rakete erhalten datengetriebene Profile mit Geschwindigkeit,
Schaden, Kollisionsradius und Lebensdauer.

Beim Erzeugen werden die normierte Schussrichtung und die Geschwindigkeit des
feuernden Schiffs kombiniert. Die deterministische Zeitschrittsimulation hält
vorherige und aktuelle Position fest und gibt abgelaufene Projektile mit ihrem
letzten Endpunkt für dieselbe Kollisionsrunde zurück.

Trefferprüfung, Broadphase, Narrowphase und Tile-Schaden bleiben getrennte
Folgeschritte in SF-071 bis SF-073.

### Kollisions-Broadphase

Welt-AABBs werden in einem 32er-Raster über die Chunk-Koordinaten indiziert.
Die Projektilabfrage verwendet das gesweepte Rechteck zwischen vorheriger und
aktueller Position, erweitert um den Kollisionsradius. Selbsttreffer werden
ausgeschlossen; Kandidaten werden dedupliziert und stabil sortiert. Diese Stufe
prüft keine exakten Formen und verändert keine Tile-HP.

### Kollisions-Narrowphase

Für jeden Broadphase-Kandidaten prüft die Narrowphase das kontinuierliche
Kreisprojektil gegen die Ziel-AABB. Sie gibt den frühesten Trefferzeitpunkt
innerhalb des Zeitschritts, die Projektilmitte und den nächstgelegenen
Kontaktpunkt zurück. Eckkontakte werden kreisförmig statt über eine
übermäßig große, erweiterte AABB geprüft. Trefferprüfung verändert weder
Projektile noch Ziele; SF-073 übernimmt den lokalen Schaden.

### Chunks aktivieren

Chunks besitzen die flüchtigen Zustände `dormant`, `active` und `combat`.
Neue sowie geladene Chunks beginnen in `dormant`; eine Fragmentierung übernimmt
den Zustand des jeweiligen Quell-Chunks. Ereignisbasierte Aktivierung und
zeitgesteuerte Deaktivierung werden getrennt in SF-081 und SF-082 umgesetzt.

### Lokaler Schaden

Die Schadensmenge des Projektilprofils wird in Version 1 direkt von den
Trefferpunkten des adressierten Tiles abgezogen. Fehlende Tiles ergeben einen
expliziten Fehlschlag ohne Zustandsänderung. Bei null Trefferpunkten wird das
Tile aus seinem Chunk entfernt; die bestehende Fragmentierungs-API berechnet
anschließend verbleibende Komponenten, die die Weltlogik atomar übernehmen
muss. Eine Rüstungsmitigation ist ohne festgelegte Formel nicht enthalten;
Explosion, Feuer und Kurzschluss bleiben Sekundärschäden für spätere Schritte.

**Ablauf:**

```text
Treffer
  ↓
Tile-HP reduzieren
  ↓
Tile zerstört
  ↓
Nachbarflächen freigelegt
```

### Sekundärschäden

Version 1:

- Explosion
- Feuer
- Kurzschluss

### Milestone 4

- Lokale Zerstörung
- Schiffe können zerbrechen
- Performance stabil

## Phase 5 – Ressourcen und Bergbau

### Ziel

Von einer Sandbox zu einem Spiel wechseln.

### Ressourcen

- Ore
- Ice
- Gas
- Scrap

### Asteroiden

Asteroiden bestehen selbst aus Tiles.

### Mining Laser

**Mechanik:**

```text
Asteroid-Tile zerstören
  ↓
Resource Drop
  ↓
Einsammeln
```

### Milestone 5

- Mining Loop
- Ressourceninventar
- Wirtschaftliche Grundlage

## Phase 6 – Open World

### Ziel

Eine persistente Welt schaffen.

### Weltenkarte

Implementieren:

```text
4096 × 4096 Sektoren
```

Jeder Sektor enthält:

```typescript
Seed
Difficulty
Objects
Ownership
```

### Ringsystem

**Berechnung:**

```text
distance = CenterDistance()

difficulty =
  distance * modifier
```

### Streaming

Der Spieler bewegt sich; nur Nachbarsektoren werden geladen.

### Milestone 6

- Galaxie vorhanden
- Streaming funktioniert
- Große Welt simuliert

## Phase 7 – Basen

### Ziel

Stationäre Konstruktionen ermöglichen.

### Basistypen

- Mining
- Factory
- Research
- Defense

### Stationslogik

Stationen nutzen dasselbe Tilesystem wie Schiffe. Es gibt keine Sonderbehandlung.

### Milestone 7

- Erste Stationen
- Produktion möglich
- Wirtschaft startet

## Phase 8 – Industrie

### Ziel

Eine Factorio-Ebene hinzufügen.

### Produktionsketten

```text
Ore
  ↓
Refinery
  ↓
Steel
  ↓
Components
  ↓
Ship Parts
```

### Transport

**Version 1:**

- Direkte Lagerverbindung

**Version 2:**

- Drohnen
- Frachter

### Milestone 8

- Volle Produktionskette
- Schiffsbau aus Ressourcen

## Phase 9 – Forschung

### Forschungsbäume

#### Militär

- Laser
- Raketen
- Schilde

#### Industrie

- Mining
- Automation
- Production

#### Wissenschaft

- Scanner
- Sprungantrieb
- Xeno-Tech

### Milestone 9

- Langzeitprogression
- Freischaltsystem

## Phase 10 – Fraktionen

### Fraktionen

- Imperium
- Piraten
- Händler
- Maschinenkollektiv
- Nomaden

### Schiffsgenerierung

Keine festen Schiffe. Der Generator nutzt:

- Tile Budget
- Technologiestufe
- Fraktionsdoktrin

**Beispiel:**

```text
Pirat
  ↓
Schnell
Billig
Aggressiv
```

### Milestone 10

- Galaxie lebt
- Dynamische Gegner
- Handel und Kriege

## Phase 11 – Flotten

### Hierarchie

- Flaggschiff
- Jäger
- Frachter
- Support

### Rollenbasierte KI

- Escort
- Harvester
- Carrier
- Artillery

### Milestone 11

- Spielerflotten
- Große Schlachten

## Phase 12 – Endgame

### Megastrukturen

- Orbital Ring
- Dyson Swarm
- Planetary Forge
- Sector Gate

### Krisen

- Maschinenaufstand
- Extraktionale Invasion
- Void Storms
- Ancient AI Awakening

## Finales Architekturziel

Wenn alle Phasen abgeschlossen sind, muss die Engine nach folgendem Prinzip arbeiten:

```text
Galaxie
  ↓
Sektor
  ↓
Objekt
  ↓
Konstruktion
  ↓
Chunk
  ↓
Tile
```

Außerdem gilt:

```text
95 % aller Berechnungen
= Objekt- oder Chunk-Ebene

< 5 %
= Tile-Ebene
```

Das ist die zentrale Voraussetzung dafür, dass Tausende von Schiffen, Stationen und Produktionsanlagen in einer riesigen persistenten Welt existieren können, ohne dass die Tile-Simulation die Hardware überlastet.
