# Stellar Frontier

Ein 2D-Tile-basierter Space-Survival-Builder mit modularen Schiffen, lokalem Schaden und einer persistenten, gestreamten Welt. Dieses Repository beginnt bewusst mit der technischen P0-Grundlage statt mit Gameplay-Features.

## Entwicklungsumgebung

Voraussetzung: Node.js 20.19+ oder 22.12+.

```shell
npm ci
npm run dev
npm test
npm run lint
npm run build
```

Die App stellt zunächst ein interaktives Tile- und Chunk-Labor bereit. Tile setzen, ersetzen, entfernen, Speichern/Laden und die lokale Gate-A-Messung lassen sich dort ausprobieren.

## Technische Ausgangslage

- **TypeScript + Vite:** schlanke Build- und Entwicklungsumgebung.
- **Canvas 2D:** zunächst kein zusätzliches Game-Engine-Runtime-Framework. Ein Wechsel wird erst nach einem gemessenen Bedarf erwogen.
- **32 × 32 Tiles pro Chunk:** verbindliche Speicher- und Lookup-Einheit.
- **Konstruktionen und Tilesimulation:** der P0-Kern bleibt unabhängig von Rendering und UI testbar.
- **Vierer-Nachbarschaft:** Konstruktionen gelten über Kantenverbindungen als zusammenhängend; diagonaler Kontakt verbindet Tiles nicht.
- **Thruster:** Vier Himmelsrichtungen; Nord ist negative Y-Richtung. Save-Version 1 wird beim Laden mit Nord als Standardausrichtung migriert.
- **Trägheit:** Tiles werden für die P1-Näherung als gleichmäßig verteilte Einheitsquadrate modelliert.
- **Flugphysik:** Semi-implizite 2D-Integration; Thrusterleistung wird pro Chunk budgetiert und als Kraft/Drehmoment angewendet. Layout, Masseigenschaften und Powerbudget werden bei Änderungen aufgebaut und pro Zeitschritt wiederverwendet.
- **Tilewerte:** Die Registry enthält vorläufige Prototypwerte, keine final abgestimmte Spielbalance.
- **Noch offen:** Zielhardware, finale FPS-Schwelle, Welt-/Sektorgröße, aktiver Radius und Größe logischer Module.

## Projektstruktur

```text
src/
  core/           Konfiguration, Koordinaten und Tile-Daten
  construction/   Konstruktionen und Fragmentierung
  editor/         Wiederverwendbare Platzierungsmuster
  energy/         Chunk-Energieflüsse, Budgets und Prioritätsallocator
  game/           Beispielkonstruktion für das Labor
  physics/        Masse, Schwerpunkt, Trägheit und Thruster
  rendering/      Canvas-Renderer
  save/           Versionierte Persistenz
  ui/             Browser-Labor
  world/          Chunk-Datenstruktur
tests/        Unit- und Skalierungstests
```

## Verbindliche Projektdokumente

- [Handoff](./Handoff.md) – Spielvision und technische Leitplanken
- [BACKLOG](./BACKLOG.md) – Task-IDs, Prioritäten, Abhängigkeiten und Akzeptanzkriterien
- [Priorisierung](./Priorisierung.md) – kritischer Pfad
- [Implementierungsplan](./Implementierungsplan.md) – Phasen und technische Umsetzung
- [Skalierungsprofile](./SKALIERUNG.md) – reproduzierbare Lasttests und Messregeln

Bei Abweichungen gilt der Backlog als Quelle für Task-IDs und Akzeptanzkriterien. Offene Architekturentscheidungen werden nicht als bereits festgelegte Anforderungen behandelt.

## Status

Die Grundlage umfasst Konfiguration, Tile-Registry, 32 × 32-Chunks, Konstruktionen, Fragmentierung, versioniertes Speichern/Laden, sichtbereichsbegrenztes Rendering und den automatisierten 10.000-Tile-/100-Chunk-Roundtrip-Test. Sechs lokale Produktionsläufe erfüllen die provisorische Desktop-Entwicklungsbaseline; die finale mobile Gate-A-Freigabe bleibt offen. P1 umfasst Energieflüsse/Prioritäten, Masse, Schwerpunkt, Trägheit, orientierbare Thruster mit Rigid-Body-Schritt sowie Linien-/Rechteckplatzierung. Versionierte Blueprint-Importe und -Exporte nutzen JSON; Version 1 wird beim Laden zu Version 2 mit Nordausrichtung migriert. Ein Gate-B-Funktionstest deckt 1.000 Tiles und 600 Zeitschritte ab. SF-070 bis SF-073 bilden die Projektil-, Kollisions- und lokale Schadensgrundlage; SF-080 bis SF-082 verwalten flüchtige Chunk-Zustände mit Ereignisaktivierung und deterministischer Deaktivierung. SF-090 modelliert Asteroiden als chunkbasierte `rock`-Tiles mit validierten Ressourcenablagerungen. Mining-Laser und Ressourcenloot folgen in SF-091 und SF-092. Rüstungsmitigation und Sekundärschäden sind noch nicht festgelegt. Mobile Hardwarevalidierung und weitere Verbraucherzuordnungen bleiben offen. Details und Messwerte stehen in [SKALIERUNG.md](./SKALIERUNG.md).
