# Priorisierung und kritischer Pfad

Das Entscheidende für einen Agenten ist nicht die Task-Liste selbst, sondern der kritische Pfad. Wenn die Abhängigkeiten falsch sind, baut der Agent möglicherweise fünf Wochen an Features, die später wegen Architekturproblemen wieder verworfen werden müssen.

Die Planung ist deshalb in die Prioritäten P0 bis P4 gegliedert.

> Verbindliche Task-IDs, Abhängigkeiten und Akzeptanzkriterien stehen in [BACKLOG.md](./BACKLOG.md). Dieses Dokument beschreibt die Reihenfolge; bei Widersprüchen gilt der Backlog.

## P0 – Architekturkritisch

Ohne diese Tasks darf kein Gameplay entwickelt werden.

### Epic 1 – Projektgrundgerüst

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 1.1 Projektstruktur | P0 | Keine |
| 1.2 Buildpipeline | P0 | 1.1 |
| 1.3 Konfigurationssystem | P0 | 1.1 |

### Epic 2 – Tile-System

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 2.1 Tile-Klasse | P0 | 1.x |
| 2.2 Tile-Registry | P0 | 2.1 |
| 2.3 Tile-Platzierung | P0 | 2.2 |

### Epic 3 – Chunk-System

Höchste technische Priorität.

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 3.1 Chunk-Struktur | P0 | 2.3 |
| 3.2 Chunk-Lookup | P0 | 3.1 |
| 3.3 Chunk-Grenzen | P0 | 3.2 |

### Epic 4 – Konstruktionen

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 4.1 Construction Entity | P0 | 3.x |
| 4.2 Flood Fill | P0 | 4.1 |
| 4.3 Fragmentierung | P0 | 4.2 |

### Gate A

Vor der Weiterentwicklung muss Folgendes nachgewiesen werden:

```text
10.000 Tiles
100 Chunks
Speichern und Laden
60 FPS
```

Wird das Gate nicht bestanden:

- Optimieren
- Keine neuen Features entwickeln

Die dokumentierte lokale Produktionsmessung erfüllt vorläufig die Desktop-Entwicklungsbaseline für P1. Das finale mobile Zielgerät und die Freigabe für einen Release bleiben offen.

## P1 – Kernsimulation

Jetzt entsteht das eigentliche Spiel.

### Epic 6 – Energie

**Warum zuerst?** Nahezu jedes spätere System benötigt Energie.

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 6.1 Reaktoren | P1 | Gate A |
| 6.2 Verbraucher | P1 | 6.1 |
| 6.3 Netzwerke | P1 | 6.2 |
| 6.4 Prioritäten | P1 | 6.3 |

### Epic 7 – Physik

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 7.1 Masse | P1 | 4.1 |
| 7.2 Schwerpunkt | P1 | 7.1 |
| 7.3 Trägheit | P1 | 7.2 |
| 7.4 Thruster | P1 | 6.x und 7.3 |

### Epic 5 – Editor

Kann parallel entwickelt werden.

| Task | Priorität |
| --- | --- |
| 5.1 Baumodus | P1 |
| 5.2 Mehrfachplatzierung | P1 |
| 5.3 Blueprint-System | P1 |

### Gate B

Nachweis:

```text
1000-Tile-Schiff
Korrekte Energie
Korrekte Masse
Korrekte Rotation
```

## P2 – Kern-Gameplay

Jetzt entsteht das eigentliche Spielvergnügen.

### Epic 8 – Kampf

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 8.1 Projektile | P2 | Gate B |
| 8.2 Broadphase | P2 | 3.x |
| 8.3 Narrowphase | P2 | 8.2 |
| 8.4 Schaden | P2 | 8.3 |

### Epic 9 – Aktivierungssystem

Das Aktivierungssystem ist der wichtigste Optimierungsschritt.

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 9.1 Chunk States | P2 | 3.x |
| 9.2 Aktivierung | P2 | 8.x |
| 9.3 Deaktivierung | P2 | 9.2 |

### Epic 10 – Bergbau

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 10.1 Asteroiden | P2 | 8.4 |
| 10.2 Mining Laser | P2 | 10.1 |
| 10.3 Ressourcenloot | P2 | 10.2 |

### Gate C

Erster spielbarer Loop:

```text
Bauen
Fliegen
Kämpfen
Abbauen
Speichern
```

Erst jetzt besitzt das Projekt überhaupt ein MVP.

## P3 – Open World

Erst jetzt lohnt sich Weltinhalt. Viele Entwickler machen den Fehler, damit zu früh zu beginnen.

### Epic 11 – Galaxie

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 11.1 Sector Model | P3 | Gate C |
| 11.2 Weltgenerator | P3 | 11.1 |
| 11.3 Ringsystem | P3 | 11.2 |

### Epic 12 – Streaming

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 12.1 Laden | P3 | 11.x |
| 12.2 Entladen | P3 | 12.1 |
| 12.3 Background Sim | P3 | 12.2 |

### Epic 13 – Stationen

| Task | Priorität | Abhängigkeit |
| --- | --- | --- |
| 13.1 Stationsobjekte | P3 | 12.x |
| 13.2 Docking | P3 | 13.1 |
| 13.3 Lagertransfer | P3 | 13.2 |

### Gate D

Nachweis:

```text
Spieler bewegt sich zwischen Sektoren
Streaming funktioniert
Keine FPS-Einbrüche
Keine Speicherlecks
```

## P4 – Langzeitmotivation

Erst jetzt lohnt sich Content.

### Epic 14 – Industrie

**Abhängigkeit:** P3 vollständig.

### Epic 15 – Forschung

**Abhängigkeit:** Industrie.

### Epic 16 – KI

**Abhängigkeiten:**

- Industrie
- Kampf
- Open World
- Forschung

### Epic 17 – Fraktionen

**Abhängigkeiten:**

- KI
- Galaxie

### Epic 18 – Flotten

**Abhängigkeiten:**

- KI
- Physik
- Kampf

### Epic 19 – Endgame

**Abhängigkeit:** Alles andere.

### Epic 20 – Skalierung und Profiling

Die Lastprofile sind in [BACKLOG.md](./BACKLOG.md) unter SF-190 bis SF-194 verbindlich beschrieben. Die Details zur Messung stehen in [SKALIERUNG.md](./SKALIERUNG.md). Skalierungstests laufen ergänzend zu den jeweiligen Gates, nicht erst am Ende des Projekts.

## Tatsächlicher kritischer Pfad

Wenn ein VS-Code-Agent autonom arbeiten soll, sollte er exakt dieser Reihenfolge folgen:

```text
Projektstruktur
↓
Tile-System
↓
Chunk-System
↓
Konstruktionen
↓
Benchmark
↓
Energie
↓
Physik
↓
Editor
↓
Benchmark
↓
Kampf
↓
Chunk-Aktivierung
↓
Bergbau
↓
Gate C Integration
↓
Benchmark
↓
Galaxie
↓
Streaming
↓
Stationen
↓
Benchmark
↓
Industrie
↓
Forschung
↓
KI
↓
Fraktionen
↓
Flotten
↓
Endgame
```

## Zusätzliche Agentenregeln

- **RULE-007:** Kein Task der Priorität P3 oder höher darf begonnen werden, solange die aktuelle Benchmark-Suite nicht grün ist.
- **RULE-008:** Jeder neue Feature-Branch muss einen Lasttest enthalten.
- **RULE-009:** Performance ist ein First-Class-Feature und kein nachträglicher Optimierungsschritt.

Das ist die Art von Roadmap, die ein autonomer Agent wochenlang abarbeiten kann, ohne die Architektur aus dem Fokus zu verlieren.
