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
- **Noch offen:** finale FPS-Schwelle, mobiles Release-Ziel, Welt-/Sektorgröße, aktiver Radius und Größe logischer Module. Das lokale VS-Code-Zielprofil ist festgelegt; die Prozessmetriken bleiben eingeschränkt.

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

Die Grundlage umfasst Konfiguration, Tile-Registry, 32 × 32-Chunks, Konstruktionen, Fragmentierung, versioniertes Speichern/Laden, sichtbereichsbegrenztes Rendering und den automatisierten 10.000-Tile-/100-Chunk-Roundtrip-Test. Acht Produktionsläufe auf dem bestätigten lokalen VS-Code-Zielprofil erfüllen die provisorische Desktop-Entwicklungsbaseline; sieben von acht Läufen erreichten mindestens 60 FPS. Die mobile Gate-A-Freigabe bleibt separat offen. P1 umfasst Energieflüsse/Prioritäten, Masse, Schwerpunkt, Trägheit, orientierbare Thruster mit Rigid-Body-Schritt sowie Linien-/Rechteckplatzierung. Versionierte Blueprint-Importe und -Exporte nutzen JSON; Version 1 wird beim Laden zu Version 2 mit Nordausrichtung migriert. Ein Gate-B-Funktionstest deckt 1.000 Tiles und 600 Zeitschritte ab. SF-070 bis SF-073 bilden die Projektil-, Kollisions- und lokale Schadensgrundlage; SF-080 bis SF-082 verwalten flüchtige Chunk-Zustände mit Ereignisaktivierung und deterministischer Deaktivierung. SF-090 bis SF-092 bilden die Mining-Grundlage aus chunkbasierten Asteroiden, energieabhängigem Laser, genau einmal erzeugtem Ressourcenloot und dedupliziertem Inventar. SF-093 verbindet diese Systeme im Mission Lab; ein lokaler Browser-Playthrough aus Bauen, Fliegen, Kämpfen, Abbauen, Einsammeln und Missions-Speichern/Laden war erfolgreich. Gate C ist im Entwicklungsprototyp funktional abgenommen. SF-100 bis SF-102 liefern Sektormodell, ringbasierte deterministische Asteroidengeneration und explizit parametrisierte Distanzschwierigkeit; SF-110 bis SF-112 verwalten Sektorladen, Entladung und deterministische Hintergrundschritte. SF-120 bis SF-122 modellieren Stationen, portbasiertes Docking und nur im Dock mögliche atomare Ressourcenübergabe. SF-191 wurde über acht Produktionsläufe auf dem bestätigten Zielprofil mit einem Median von 60,04 FPS profiliert; sieben von acht Läufen erreichten mindestens 60 FPS. JavaScript-Arbeitszeit, Kollisionsereignisse und Browser-JS-Heap sind messbar; systemweite CPU-Auslastung und Prozess-RAM sind nicht verfügbar. SF-192 wurde mit zehn Stationen à 10.000 Tiles in acht Produktionsläufen auf dem bestätigten Zielprofil gemessen (Median 59,87 FPS; Median JS-Heap-Delta +5,33 MiB). Vier von acht Läufen erreichten 60 FPS; die provisorische Desktop-60-FPS-Baseline ist nicht erfüllt. Das Profil rendert Stationen sequenziell. Rüstungsmitigation und Sekundärschäden sind noch nicht festgelegt. Weitere Messwerte stehen in [SKALIERUNG.md](./SKALIERUNG.md).

SF-194 ergänzt die Browserberichte um eine einheitliche, maschinenlesbare Kennzeichnung gemessener, nicht gemessener und nicht verfügbarer Profiling-Metriken. SF-193 bleibt blockiert, bis SF-150 bis SF-152 umgesetzt sind.

Gate D wurde auf dem bestätigten lokalen Zielprofil mit acht Produktionsläufen profiliert: `CanvasSectorRenderer` zeichnet die aktive 3×3-Sektorkarte einschließlich Asteroidenreferenzen; der Cache blieb bei neun Sektoren und der FPS-Median betrug 60,04. Gate-Freigabe bleibt manuell; Schiff- und Stationskonstruktionen sind nicht Teil dieses Sektorprofils. Das Zielgerät meldet Intel Core i5-8250U, 8 logische Prozessoren, 7,86 GiB physischen RAM und integrierte Intel UHD Graphics 620. Browsermessungen erfassen weder systemweite CPU-Auslastung noch Prozess-RAM.

SF-130 ergänzt die provisorische Produktionskette Ore → Steel → Components → Ship Parts mit einem validierten Rezeptregister und atomarer Inventartransaktion. Mengen und Laufzeiten sind ausdrücklich Prototypwerte; Produktionsmodule und Warteschlangen folgen mit SF-131/SF-132.

SF-131 ordnet Refinery- und Assembler-Module Factory-Stationen zu. Module können ausschließlich ihre registrierten Rezepte auf dem Stationsinventar ausführen; SF-132 bleibt für Warteschlangen zuständig.
