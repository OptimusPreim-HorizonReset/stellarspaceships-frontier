# Skalierungs- und Benchmarkprofile

Dieses Dokument konkretisiert die Leistungstests aus [BACKLOG.md](./BACKLOG.md). Die Tests belegen verschiedene Lastfälle; ein Ergebnis gilt nur für die dokumentierte Hardware und den dokumentierten Build.

## Verbindliche Messregeln

- Funktionale Tests und Lasttests getrennt ausführen und ausweisen.
- Zielhardware, Betriebssystem, Buildmodus und Messdauer für jedes Ergebnis dokumentieren.
- Für die provisorische Desktop-Entwicklungsbaseline mindestens sechs Produktionsläufe auswerten: Median der durchschnittlichen FPS ≥ 60 und mindestens fünf von sechs Läufen ≥ 60 FPS.
- Framerate, CPU und RAM erfassen; bei Bedarf zusätzlich Chunk-Aktivität, Physik, Kollision und Speichern/Laden.
- Die Browsermessung in einem Produktionsbuild mit sichtbarem Tab ausführen; der Dev-Server ist kein Gate-Nachweis.
- Keine Freigabe erteilen, wenn ein Benchmark fehlt oder seine Messbedingungen nicht angegeben sind.
- Die 60-FPS-Anforderung gilt erst dann als nachgewiesen, wenn sie auf der vereinbarten Zielhardware gemessen wurde. Lokale Unit-Tests allein weisen sie nicht nach.

## Gate-A-Messung ausführen

1. `npm ci` und `npm run build` ausführen.
2. Den Produktionsbuild mit `npm run preview` starten und die angezeigte lokale URL im Vordergrund öffnen.
3. Im World Lab **Lokal messen** wählen und warten, bis der JSON-Bericht erscheint.
4. Den Bericht über **JSON exportieren** speichern und zusammen mit Betriebssystem, Zielhardware und Messbedingungen auswerten.

Die Messung prüft 10.000 Tiles in 100 Chunks, den Save/Load-Roundtrip und 30 Aufwärm- plus 180 Messframes. Erfasst werden sichtbare Tiles pro Frame, durchschnittliche FPS, p95-Frameintervall, Frames über dem 60-FPS-Budget und Renderdauer. Der Bericht enthält Browser-/Viewportdaten, wird nicht automatisch hochgeladen und markiert Gate A niemals selbst als bestanden.

## Vorläufige lokale Referenzmessung

Provisorische Desktop-Entwicklungsbaseline: Produktionspreview im integrierten VS-Code-Browser, Viewport 476 × 339 CSS-Pixel, DPR 1,5. Die 10.000 Tiles lagen in 100 Chunks; bei diesem Viewport waren 76 Tiles und ein Chunk pro Frame sichtbar. Sechs Läufe mit demselben Profil:

| Lauf | Durchschnitt | p95-Frameintervall | Intervalle > 16,67 ms | Render Ø / p95 | Serialize / Deserialize |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 60,04 FPS | 16,8 ms | 93 / 180 | 0,43 / 1,5 ms | 34,0 / 80,9 ms |
| 2 | 60,04 FPS | 16,8 ms | 93 / 180 | 0,31 / 0,7 ms | 13,3 / 30,3 ms |
| 3 | 60,04 FPS | 17,0 ms | 89 / 180 | 0,40 / 1,0 ms | 12,8 / 44,7 ms |
| 4 | 60,03 FPS | 16,9 ms | 95 / 180 | 0,17 / 0,3 ms | 15,3 / 20,5 ms |
| 5 | 60,04 FPS | 16,8 ms | 95 / 180 | 0,43 / 1,6 ms | 20,6 / 49,3 ms |
| 6 | 59,38 FPS | 19,6 ms | 99 / 180 | 0,85 / 3,3 ms | 17,1 / 46,9 ms |

Chunk-basiertes Sichtbereichs-Culling reduzierte die durchschnittliche Renderdauer gegenüber dem vorherigen Vollscan in der lokalen Einzelmessung von 6,07 ms auf 0,17–0,85 ms. Über die sechs Läufe lagen die durchschnittlichen FPS bei 59,38–60,04; der p95-Frameintervall bei 16,8–19,6 ms. Der Zähler für Intervalle über 16,67 ms ist ein strikter Vergleich mit dem theoretischen 60-FPS-Budget und kein eigenständiger Nachweis sichtbarer Frame-Drops.

Der Median der sechs FPS-Werte ist 60,04; fünf von sechs Läufen erreichen mindestens 60 FPS. Damit ist die provisorische Desktop-Entwicklungsbaseline für P1 erfüllt. Der mobile Release-Gate bleibt offen.

Ein Chromium-Heap-Snapshot des letzten Laufs lag bei 6,46 MB vor dem Profil, 10,76 MB nach Save/Load und 10,52 MB nach Rendering. Das ist eine JS-Heap-Momentaufnahme und kein Prozess- oder System-RAM-Wert.

Dies ist nur eine lokale Referenz: Die offizielle Zielhardware wurde nicht festgelegt, CPU-/RAM-Profiling ist noch offen und Gate A bleibt **nicht freigegeben**.

## Profile und Freigaben

| Backlog-Aufgabe | Lastprofil | Zweck |
| --- | --- | --- |
| SF-190 / Gate A | 10.000 Tiles, mindestens 100 Chunks, Speichern und Laden | Grundarchitektur und Persistenz validieren |
| Gate B | 1.000-Tile-Schiff mit Energie, Masse und stabiler Flugphysik | Kernsimulation validieren |
| SF-191 | 3.000-Tile-Schiff mit Kampf- und Schadenssimulation | Mobile Konstruktionen unter Kampf-Last prüfen |
| SF-192 | Zehn Stationen mit je 10.000 Tiles | Stationen und Open-World-Last prüfen |
| SF-193 | 100 NPC-Schiffe gleichzeitig | Skalierung der NPC-Simulation prüfen |

Der Gate-B-Funktionstest in `tests/gateB.integration.test.ts` simuliert ein 1000-Tile-Schiff über 600 feste 1/60-Sekunden-Zeitschritte. Er prüft Energie, Masse, Thrusterkräfte und endliche Zustandswerte; er ersetzt keinen FPS-Benchmark auf Zielhardware.

## Profiling-Bericht

Der JSON-Bericht erfasst für die vorhandenen P0-Systeme:

- JavaScript-Renderzeit als CPU-Zeit pro Frame
- Browser-JS-Heap vor/nach Save/Load und Rendern, wenn `performance.memory` verfügbar ist
- gesamte Chunks und sichtbare/rendered Chunks pro Frame
- Serialize- und Deserialize-Dauer

Systemweite CPU-Auslastung und Prozess-RAM sind im Browser nicht verfügbar und bleiben explizit als nicht gemessen markiert. Simulationszustände für Chunks sowie Physik- und Kollisionsprofile werden als nicht implementiert ausgewiesen, bis die jeweiligen Systeme existieren. SF-194 bleibt offen, bis die erforderlichen Systemmetriken erfasst und die Berichte nach jedem Gate unter gleichen Bedingungen verglichen werden können.

## Scope der aktuellen Grundlage

Die automatisierten Tests prüfen die korrekte Erzeugung und den verlustfreien Roundtrip von 10.000 Tiles in 100 Chunks. Das World Lab ergänzt eine reproduzierbare lokale Browsermessung. Ein Nachweis für 60 FPS auf vereinbarter Zielhardware liegt erst nach Ausführung und Prüfung eines Produktionsbuild-Berichts vor; bis dahin bleibt Gate A offen.
