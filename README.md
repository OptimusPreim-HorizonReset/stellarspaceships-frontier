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

Die App stellt zunächst ein interaktives Tile- und Chunk-Labor bereit. Tile setzen, ersetzen, entfernen sowie Speichern und Laden lassen sich dort direkt ausprobieren.

## Technische Ausgangslage

- **TypeScript + Vite:** schlanke Build- und Entwicklungsumgebung.
- **Canvas 2D:** zunächst kein zusätzliches Game-Engine-Runtime-Framework. Ein Wechsel wird erst nach einem gemessenen Bedarf erwogen.
- **32 × 32 Tiles pro Chunk:** verbindliche Speicher- und Lookup-Einheit.
- **Konstruktionen und Tilesimulation:** der P0-Kern bleibt unabhängig von Rendering und UI testbar.
- **Vierer-Nachbarschaft:** Konstruktionen gelten über Kantenverbindungen als zusammenhängend; diagonaler Kontakt verbindet Tiles nicht.
- **Tilewerte:** Die Registry enthält vorläufige Prototypwerte, keine final abgestimmte Spielbalance.
- **Noch offen:** Zielhardware, finale FPS-Schwelle, Welt-/Sektorgröße, aktiver Radius und Größe logischer Module.

## Projektstruktur

```text
src/
  core/           Konfiguration, Koordinaten und Tile-Daten
  construction/   Konstruktionen und Fragmentierung
  game/           Beispielkonstruktion für das Labor
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

Die erste P0-Grundlage umfasst Konfiguration, Tile-Registry, 32 × 32-Chunks, Konstruktionen, Fragmentierung, versioniertes Speichern/Laden, ein Browser-Labor und einen automatisierten 10.000-Tile-/100-Chunk-Roundtrip-Test. Gate A ist **noch nicht bestanden**, bis die 60-FPS-Messung auf der Zielhardware dokumentiert ist.
