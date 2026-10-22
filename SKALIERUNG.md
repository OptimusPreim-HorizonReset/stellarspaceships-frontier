# Skalierungs- und Benchmarkprofile

Dieses Dokument konkretisiert die Leistungstests aus [BACKLOG.md](./BACKLOG.md). Die Tests belegen verschiedene Lastfälle; ein Ergebnis gilt nur für die dokumentierte Hardware und den dokumentierten Build.

## Verbindliche Messregeln

- Funktionale Tests und Lasttests getrennt ausführen und ausweisen.
- Zielhardware, Betriebssystem, Buildmodus und Messdauer für jedes Ergebnis dokumentieren.
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

Produktionspreview im integrierten VS-Code-Browser, Viewport 476 × 339 CSS-Pixel, DPR 1,5. Die 10.000 Tiles lagen in 100 Chunks; bei diesem Viewport waren 76 Tiles pro Frame sichtbar. Vier Läufe mit demselben Profil:

| Lauf | Durchschnitt | p95-Frameintervall | Intervalle > 16,67 ms | Render Ø / p95 | Serialize / Deserialize |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 60,04 FPS | 16,8 ms | 93 / 180 | 0,43 / 1,5 ms | 34,0 / 80,9 ms |
| 2 | 60,04 FPS | 16,8 ms | 93 / 180 | 0,31 / 0,7 ms | 13,3 / 30,3 ms |
| 3 | 60,04 FPS | 17,0 ms | 89 / 180 | 0,40 / 1,0 ms | 12,8 / 44,7 ms |
| 4 | 60,03 FPS | 16,9 ms | 95 / 180 | 0,17 / 0,3 ms | 15,3 / 20,5 ms |

Chunk-basiertes Sichtbereichs-Culling reduzierte die durchschnittliche Renderdauer gegenüber dem vorherigen Vollscan in der lokalen Einzelmessung von 6,07 ms auf 0,31–0,43 ms. Der Zähler für Intervalle über 16,67 ms ist ein strikter Vergleich mit dem theoretischen 60-FPS-Budget und kein eigenständiger Nachweis sichtbarer Frame-Drops.

Dies ist nur eine lokale Referenz: Die offizielle Zielhardware wurde nicht festgelegt, CPU-/RAM-Profiling ist noch offen und Gate A bleibt **nicht freigegeben**.

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

Die automatisierten Tests prüfen die korrekte Erzeugung und den verlustfreien Roundtrip von 10.000 Tiles in 100 Chunks. Das World Lab ergänzt eine reproduzierbare lokale Browsermessung. Ein Nachweis für 60 FPS auf vereinbarter Zielhardware liegt erst nach Ausführung und Prüfung eines Produktionsbuild-Berichts vor; bis dahin bleibt Gate A offen.
