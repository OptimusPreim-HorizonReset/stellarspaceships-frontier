# Zusätzliche Entwicklungsaufgaben

## Grundregel

> Jede Aufgabe darf maximal 1–3 Tage Entwicklungsaufwand erzeugen und muss unabhängig testbar sein.

## Epic 1 – Projektgrundgerüst

### Task 1.1 – Projektstruktur erzeugen

**Ziel:** Verzeichnisstruktur anlegen.

**Definition of Done:**

```text
/src
  /core
  /game
  /rendering
  /world
  /construction
  /combat
  /save
  /ui
/tests
```

Die Struktur ist erzeugt.

### Task 1.2 – Abhängigkeitsmanagement einrichten

**Ziel:** Buildpipeline definieren.

**Ergebnis:**

```shell
npm run build
npm run test
npm run lint
```

Alle drei Befehle funktionieren.

### Task 1.3 – Konfigurationssystem

**Ziel:** Globale Parameter zentralisieren.

**Beispiele:**

```text
WORLD_SIZE
SECTOR_SIZE
CHUNK_SIZE
ACTIVE_RADIUS
```

## Epic 2 – Tile-System

### Task 2.1 – Tile-Klasse implementieren

**Ergebnis:**

```typescript
interface Tile {
  id: number;
  type: TileType;
  hp: number;
  armor: number;
  mass: number;
}
```

### Task 2.2 – Tile-Registry

**Ziel:** Alle Tiletypen zentral registrieren.

**Ergebnis:** Die folgenden Tiletypen sind datengesteuert definiert:

- Hull
- Armor
- Reactor
- Battery
- Thruster

### Task 2.3 – Tile-Platzierung

**Zu testen:**

- Tile setzen
- Tile entfernen
- Tile ersetzen

## Epic 3 – Chunk-System

### Task 3.1 – Chunk-Datenstruktur

**Ziel:** 32 × 32 Tiles verwalten.

**Ergebnis:**

```text
Chunk {
  tiles[][]
}
```

### Task 3.2 – Chunk-Lookup

**Ziel:** Eine beliebige Weltposition dem passenden Chunk zuordnen.

### Task 3.3 – Chunk-Boundary-Test

**Ziel:** Koordinatenwechsel über Chunkgrenzen testen.

## Epic 4 – Konstruktionen

### Task 4.1 – Construction-Entity

**Ziel:** Einen Tileverbund verwalten.

**Ergebnis:**

```text
Construction {
  chunks[]
}
```

### Task 4.2 – Zusammenhangsanalyse

**Ziel:** Prüfen, ob eine Konstruktion noch verbunden ist.

**Mögliche Algorithmen:**

- Flood Fill
- BFS

### Task 4.3 – Fragmentierung

**Beispiel:**

```text
Treffer
  ↓
Schiff teilt sich
  ↓
Zwei neue Konstruktionen
```

## Epic 5 – Editor

### Task 5.1 – Baumodus

**Funktionen:**

- Linksklick: Tile platzieren
- Rechtsklick: Tile löschen

### Task 5.2 – Mehrfachplatzierung

**Beispiele:**

- Linie
- Rechteck

### Task 5.3 – Blueprint speichern

**Ergebnis:** Blueprint als `ship.json` speichern.

## Epic 6 – Energie

### Task 6.1 – Reaktor-System

**Ziel:** Energieproduktion implementieren.

### Task 6.2 – Verbrauchssystem

**Ziel:** Energieverbrauch berechnen.

### Task 6.3 – Netzwerkberechnung

**Ergebnis:**

```text
PowerGeneration - PowerUsage = NetPower
```

### Task 6.4 – Prioritätensystem

**Reihenfolge:**

1. Shields
2. Weapons
3. Industry
4. Comfort

## Epic 7 – Physik

### Task 7.1 – Massenberechnung

**Ergebnis:** Gesamtmasse berechnen.

### Task 7.2 – Schwerpunktberechnung

**Ergebnis:** Center of Mass berechnen.

### Task 7.3 – Trägheitsmoment

**Ergebnis:** Rotationsverhalten berechnen.

### Task 7.4 – Thruster-System

**Ziel:** Kraftvektoren anwenden.

## Epic 8 – Kampf

### Task 8.1 – Projectile-Entity

**Typen:**

- Laser
- Bullet
- Missile

### Task 8.2 – Broadphase-Kollision

**Ziel:** Chunk gegen Projektil prüfen, nicht Tile gegen Projektil.

### Task 8.3 – Narrowphase

**Ziel:** Das getroffene Tile bestimmen.

### Task 8.4 – Schadensmodell

**Ergebnis:**

- HP reduzieren
- Tile entfernen

## Epic 9 – Aktivierungssystem

Das Aktivierungssystem ist der wichtigste Optimierungsschritt.

### Task 9.1 – Chunk States

**Zustände:**

- Dormant
- Active
- Combat

### Task 9.2 – Automatische Aktivierung

**Trigger:**

- Treffer
- Explosion
- Reparatur

### Task 9.3 – Automatische Deaktivierung

**Beispiel:**

```text
30 Sekunden ohne Ereignis
  ↓
Dormant
```

## Epic 10 – Bergbau

### Task 10.1 – Asteroiden erzeugen

**Ergebnis:** Tilebasierte Asteroiden erzeugen.

### Task 10.2 – Mining Laser

**Ziel:** Asteroidentiles zerstören.

### Task 10.3 – Lootspawn

**Ergebnis:**

- Ore
- Gas
- Ice

## Epic 11 – Galaxie

### Task 11.1 – Sector-Datenmodell

**Ergebnis:**

```text
Sector {
  id
  seed
  objects
}
```

### Task 11.2 – Weltgenerator

**Ziel:** Eine komplette Galaxie erzeugen.

### Task 11.3 – Ring-Difficulty-System

**Formelgrundlage:**

```text
distanceFromCenter
```

## Epic 12 – Streaming

### Task 12.1 – Objektstreaming

**Ziel:** Nur nahe Objekte laden.

### Task 12.2 – Persistenz

**Ziel:** Objekte beim Entladen persistieren.

### Task 12.3 – Hintergrundsimulation

**Ergebnis:** Hintergrundsimulation ohne Tile-Simulation für:

- `resourceGain`
- `populationGrowth`
- `production`

## Epic 13 – Stationen

### Task 13.1 – Station aus Construction ableiten

**Ziel:** Keine Sonderlogik für Stationen einführen.

### Task 13.2 – Docking

**Ziel:** Andocken an eine Station ermöglichen.

### Task 13.3 – Lagertransfer

**Ziel:** Ressourcen verschieben.

## Epic 14 – Industrie

### Task 14.1 – Rezeptsystem

**Beispiel:**

```text
Ore → Steel
```

### Task 14.2 – Produktionsmodule

**Typen:**

- Refinery
- Assembler
- Smelter

### Task 14.3 – Produktionswarteschlangen

**Ziel:** Produktion automatisieren.

## Epic 15 – KI

### Task 15.1 – A*-Navigation auf Sektorebene

### Task 15.2 – NPC-Schiffsgenerator

**Eingaben:**

- Budget
- Fraktion
- Techlevel

### Task 15.3 – Kampf-KI

**Taktiken:**

- Aggressiv
- Defensiv
- Artillerie
- Carrier

## Epic 16 – Skalierungstest

Dies ist die wichtigste Epic.

### Task 16.1 – 1000-Tile-Schiff-Test

### Task 16.2 – 3000-Tile-Schiff-Test

### Task 16.3 – Zehn Stationen mit je 10.000 Tiles

### Task 16.4 – 100 NPC-Schiffe gleichzeitig

### Task 16.5 – Profiling

**Ergebnis:** Einen Report für folgende Messwerte erzeugen:

- CPU
- RAM
- Chunk Activity
- Physics
- Collision
- Save System

## Agentenregeln

- **RULE-001:** Nie Features vor Skalierung entwickeln.
- **RULE-002:** Tile-Ebene nur im Kampf simulieren.
- **RULE-003:** Die Welt darf beliebig groß sein.
- **RULE-004:** Die aktive Simulation klein halten.
- **RULE-005:** Neue Systeme müssen Chunk-basiert arbeiten.
- **RULE-006:** Jede Epic endet mit Benchmark-Tests.

Mit diesen Tasks könnte ein autonomer Agent tatsächlich mehrere Wochen iterativ arbeiten, ohne die Kernarchitektur aus den Augen zu verlieren.
