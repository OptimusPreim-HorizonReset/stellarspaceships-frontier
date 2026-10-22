# Handoff: Project Stellar Frontier

## Mission Statement

Entwickle einen 2D-Tile-basierten Open-World-Space-Survival-Builder auf Basis modularer Schiffskonstruktionen.

### Kernziel

Der Spieler baut aus Tiles Schiffe, Stationen und Basen. Alle Objekte der Spielwelt folgen denselben Konstruktionsregeln. Die Welt ist persistent, endlich und lokal gestreamt.

### Fokus

- Emergentem Gameplay
- Lokaler Tile-Zerstörung
- Technischer Optimierung
- Langer Progression
- Mobile-First-Design

Es gibt keine klassische MMO-Architektur und keine prozedural unendliche Welt.

## Core Design Philosophy

### Regel 1 – Alles ist eine Konstruktion

Es gibt keine Spezialsysteme für:

- Schiffe
- Fabriken
- Raumstationen
- Verteidigungstürme

Ein Objekt ist lediglich eine Tile-Anordnung.

### Regel 2 – Jedes Tile besitzt definierte Eigenschaften

```typescript
interface Tile {
  hp: number;
  armor: number;
  mass: number;
  powerGeneration: number;
  powerConsumption: number;
  storageCapacity: number;
  buildCost: ResourceCost;
}
```

### Regel 3 – Lokaler Schaden

Es gibt keine HP-Balken für ganze Schiffe. Stattdessen:

```text
Geschoss
  ↓
Tile getroffen
  ↓
Tile zerstört
  ↓
Benachbarte Tiles exponiert
```

Jede Zerstörung hat physische Konsequenzen.

## World Architecture

### Die Galaxie ist endlich

Es gibt keine unendliche Generierung.

Beispiele:

```text
8192 × 8192 Sektoren
```

oder:

```text
4096 × 4096 Sektoren
```

Die tatsächliche Größe richtet sich nach dem Speicherbudget.

### Ring Progression Model

Das Zentrum definiert die Schwierigkeitsstufe.

| Ring | Bereich |
| --- | --- |
| Ring 0 | Startsystem |
| Ring 1 | Sicherer Raum |
| Ring 2 | Industrie |
| Ring 3 | Grenzzonen |
| Ring 4 | Piratenraum |
| Ring 5 | Anomalien |
| Ring 6+ | Endgame |

**Formel:**

```text
difficulty = distance_from_world_center
```

Dadurch entsteht automatische Progression.

## Streaming Architecture

> **Wichtig:** Der Streamingradius gilt nicht für das Schiff des Spielers.

### Active World Radius

Beispiele:

- 256 Tiles
- 512 Tiles

Der Radius gilt um die aktuelle Position.

### Aktive Objekte

- Asteroiden
- NPCs
- Projektile
- Ressourcen
- Basen

Alles außerhalb des aktiven Bereichs wird als Datensatz gespeichert.

### Persistent Objects

Beispiel:

```json
{
  "station_id": 15,
  "ore": 250000,
  "population": 340,
  "production_rate": 22,
  "last_sim_time": 132144
}
```

Außerhalb des aktiven Bereichs findet keine Tile-Simulation statt.

## Construction Hierarchy

Dies ist der wichtigste Optimierungspunkt: Einzelne Tiles dürfen niemals permanent simuliert werden.

1. **Tile** – kleinste Einheit
2. **Module** – 32 × 32 oder 64 × 64 Tiles
3. **Konstruktion** – Schiff, Station oder Basis
4. **Objekt** – Weltobjekt im Sektor

## Combat Simulation

Nur betroffene Module werden aktiviert.

**Beispiel:**

```text
5000-Tile-Schiff

95 % des Schiffs
  ↓
Modus = Aggregiert

Lasertreffer auf Modul 12
  ↓
Modul 12 aktivieren

Lasertreffer auf Modul 13
  ↓
Modul 13 aktivieren
```

Nur aktive Schadenszonen laufen auf Tile-Ebene.

## Soft Tile Activation

```typescript
if (module.receivedDamage) {
  activateTileSimulation(module);
}
```

Nach X Sekunden:

```typescript
deactivateTileSimulation(module);
```

Danach kehrt das Modul in die Aggregatebene zurück.

## Construction Limits

### Mobile Schiffe

| Tier | Maximale Tile-Anzahl |
| --- | ---: |
| T1 | 100 |
| T2 | 300 |
| T3 | 750 |
| T4 | 1500 |
| T5 | 3000 |

### Stationen

10000+ Tiles sind erlaubt.

**Begründung:** Stationen bewegen sich nicht, benötigen keine Flugphysik und sind dadurch deutlich günstiger.

## Resource System

### Basisressourcen

- Ore
- Ice
- Gas
- Scrap
- Crystal

### Verarbeitete Ressourcen

- Steel
- Electronics
- Fuel
- Weapons
- Components

### Endgame-Ressourcen

- Antimatter
- Dark Matter
- Ancient Technology

## Survival Layer

Der Spieler benötigt:

- Energie
- Treibstoff
- Munition
- Baumaterial
- Ersatzteile

Fehlende Ressourcen verursachen Effizienzverlust. Es gibt keine künstlichen Hunger- oder Durstsysteme.

## Base Building

Basen sind normale Konstruktionen.

### Mining Base

- Mine Tiles
- Storage
- Reactor
- Defence

### Factory Base

- Refinery
- Assembly
- Storage

### Research Base

- Labs
- Datacore
- Energy Grid

## Progression

XP vermeiden. Stattdessen wird der technologische Entwicklungsgrad verwendet.

**Messgrößen:**

- Flottengröße
- Produktionskapazität
- Forschungsleistung
- Energieproduktion

## Technology Tree

Es gibt drei Hauptbereiche.

### Military

- Weapons
- Shields
- Missiles
- Drones

### Industry

- Mining
- Refining
- Automation

### Science

- Sensors
- Jump Drives
- Ancient Tech

## AI Design

NPCs nutzen dieselben Bauregeln. Es gibt kein Spawning von Spezialschiffen.

NPC-Schiffe werden erzeugt durch:

```text
Faction Blueprint
```

Der Blueprint berücksichtigt:

- Verfügbare Technologie
- Ressourcenbudget

## Endgame

Der Spieler errichtet Megastrukturen.

Beispiele:

- Orbital Ring
- Dyson Swarm
- Sector Gate Network
- Planetary Shipyard

## Non-Negotiable Technical Rules

### Verboten

- Permanente Tile-Simulation der gesamten Welt
- Projektil-Kollision gegen jedes Tile in jedem Frame
- Pfadsuche über alle Tiles jeder Konstruktion

### Pflicht

- Chunking
- LOD für Simulation

**Simulationsebenen:**

```text
Galaxy
  ↓
Sector
  ↓
Object
  ↓
Construction
  ↓
Module
  ↓
Tile
```

## Minimum Viable Product

### Phase 1

- Tile-System
- Schiffsbau
- Energie-Netzwerk
- Lokaler Schaden
- Asteroiden
- Bergbau

### Phase 2

- Open World
- Fraktionen
- Basen

### Phase 3

- Forschung
- Produktion
- Flotten

### Phase 4

- Megastrukturen
- Galaktische Ereignisse
- Endgame

Dieses Dokument ist ein geeigneter Startpunkt für einen Agenten im VS-Code-Automodus, weil es nicht nur Features beschreibt, sondern vor allem die wichtigste technische Randbedingung festlegt:

> Die Welt darf riesig sein. Die aktive Tile-Simulation darf niemals riesig sein. Die Architektur muss um dieses Prinzip herum aufgebaut werden.
