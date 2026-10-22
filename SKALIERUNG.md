# Skalierungs- und Benchmarkprofile

Dieses Dokument konkretisiert die Leistungstests aus [BACKLOG.md](./BACKLOG.md). Die Tests belegen verschiedene Lastfälle; ein Ergebnis gilt nur für die dokumentierte Hardware und den dokumentierten Build.

## Verbindliche Messregeln

- Funktionale Tests und Lasttests getrennt ausführen und ausweisen.
- Zielhardware, Betriebssystem, Buildmodus und Messdauer für jedes Ergebnis dokumentieren.
- Framerate, CPU und RAM erfassen; bei Bedarf zusätzlich Chunk-Aktivität, Physik, Kollision und Speichern/Laden.
- Keine Freigabe erteilen, wenn ein Benchmark fehlt oder seine Messbedingungen nicht angegeben sind.
- Die 60-FPS-Anforderung gilt erst dann als nachgewiesen, wenn sie auf der vereinbarten Zielhardware gemessen wurde. Lokale Unit-Tests allein weisen sie nicht nach.

## Profile und Freigaben

| Backlog-Aufgabe | Lastprofil | Zweck |
| --- | --- | --- |
| SF-190 / Gate A | 10.000 Tiles, mindestens 100 Chunks, Speichern und Laden | Grundarchitektur und Persistenz validieren |
| Gate B | 1.000-Tile-Schiff mit Energie, Masse und stabiler Flugphysik | Kernsimulation validieren |
| SF-191 | 3.000-Tile-Schiff mit Kampf- und Schadenssimulation | Mobile Konstruktionen unter Kampf-Last prüfen |
| SF-192 | Zehn Stationen mit je 10.000 Tiles | Stationen und Open-World-Last prüfen |
| SF-193 | 100 NPC-Schiffe gleichzeitig | Skalierung der NPC-Simulation prüfen |

## Profiling-Bericht

SF-194 erfasst mindestens:

- CPU-Verbrauch
- RAM-Verbrauch
- Chunk-Aktivität
- Physik
- Kollision
- Speichern und Laden

Die Messergebnisse werden für jedes Gate mit identischen Bedingungen wiederholt. Eine nicht gemessene Zielgröße wird als **offen** dokumentiert, nicht als bestanden.

## Scope der aktuellen Grundlage

Die automatisierten Tests prüfen die korrekte Erzeugung und den verlustfreien Roundtrip von 10.000 Tiles in 100 Chunks. Ein Nachweis für 60 FPS auf Zielhardware liegt noch nicht vor; Gate A bleibt deshalb offen.
