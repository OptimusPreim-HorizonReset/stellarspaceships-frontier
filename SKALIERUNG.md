# Skalierungs- und Benchmarkprofile

Dieses Dokument konkretisiert die Leistungstests aus [BACKLOG.md](./BACKLOG.md). Die Tests belegen verschiedene Lastfälle; ein Ergebnis gilt nur für die dokumentierte Hardware und den dokumentierten Build.

## Verbindliche Messregeln

- Funktionale Tests und Lasttests getrennt ausführen und ausweisen.
- Zielhardware, Betriebssystem, Buildmodus und Messdauer für jedes Ergebnis dokumentieren.
- Für die provisorische Desktop-Entwicklungsbaseline mindestens sechs Produktionsläufe auswerten: Median der durchschnittlichen FPS ≥ 60 und mindestens fünf von sechs Läufen ≥ 60 FPS.
- Framerate, CPU und RAM erfassen; bei Bedarf zusätzlich Chunk-Aktivität, Physik, Kollision und Speichern/Laden.
- Jeder JSON-Bericht weist verfügbare, nicht gemessene und nicht verfügbare Profiling-Metriken explizit aus.
- Die Browsermessung in einem Produktionsbuild mit sichtbarem Tab ausführen; der Dev-Server ist kein Gate-Nachweis.
- Keine Freigabe erteilen, wenn ein Benchmark fehlt oder seine Messbedingungen nicht angegeben sind.
- Die 60-FPS-Anforderung gilt erst dann als nachgewiesen, wenn sie auf der vereinbarten Zielhardware gemessen wurde. Lokale Unit-Tests allein weisen sie nicht nach.

## Bestätigtes Zielprofil

Am 24.10.2026 wurde der Rechner hinter den geteilten VS-Code-Browserseiten als Zielhardware festgelegt. Erfasstes Profil: Intel Core i5-8250U @ 1,60 GHz (4 Kerne / 8 logische Prozessoren), 7,86 GiB vom Betriebssystem gemeldeter physischer RAM, integrierte Intel UHD Graphics 620 und Windows 11 Pro, Version 10.0.26200 (Build 26200). Die CIM-Angabe von 1 GiB GPU-Adapter-RAM ist bei der integrierten GPU kein bestätigter dedizierter VRAM-Wert.

Benchmarkberichte enthalten dieses Hardwareprofil und setzen `targetHardwareConfirmed` nur dann auf `true`, wenn die Browserumgebung zum user-designierten Windows-/VS-Code-/Electron-/Chromium-Profil und zu 8 logischen Prozessoren passt. Das Feld bestätigt eine passende Laufzeit-Signatur, keine eindeutige Hardware-ID. Systemweite CPU-Auslastung und Prozess-RAM bleiben im Browser dennoch nicht messbar.

## Gate-A-Messung ausführen

1. `npm ci` und `npm run build` ausführen.
2. Den Produktionsbuild mit `npm run preview` starten und die angezeigte lokale URL im Vordergrund öffnen.
3. Im World Lab **Lokal messen** wählen und warten, bis der JSON-Bericht erscheint.
4. Den Bericht über **JSON exportieren** speichern und zusammen mit Betriebssystem, Zielhardware und Messbedingungen auswerten.

Die Messung prüft 10.000 Tiles in 100 Chunks, den Save/Load-Roundtrip und 30 Aufwärm- plus 180 Messframes. Erfasst werden sichtbare Tiles pro Frame, durchschnittliche FPS, p95-Frameintervall, Frames über dem 60-FPS-Budget und Renderdauer. Der Bericht enthält Browser-/Viewportdaten, wird nicht automatisch hochgeladen und markiert Gate A niemals selbst als bestanden.

## Vorläufige lokale Referenzmessung

Provisorische Desktop-Entwicklungsbaseline: Produktionspreview im integrierten VS-Code-Browser, Viewport 476 × 339 CSS-Pixel, DPR 1,5. Die 10.000 Tiles lagen in 100 Chunks; bei diesem Viewport waren 76 Tiles und ein Chunk pro Frame sichtbar. Acht Läufe mit demselben Profil:

| Lauf | Durchschnitt | p95-Frameintervall | Intervalle > 16,67 ms | Render Ø / p95 | Serialize / Deserialize |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 60,04 FPS | 16,8 ms | 93 / 180 | 0,43 / 1,5 ms | 34,0 / 80,9 ms |
| 2 | 60,04 FPS | 16,8 ms | 93 / 180 | 0,31 / 0,7 ms | 13,3 / 30,3 ms |
| 3 | 60,04 FPS | 17,0 ms | 89 / 180 | 0,40 / 1,0 ms | 12,8 / 44,7 ms |
| 4 | 60,03 FPS | 16,9 ms | 95 / 180 | 0,17 / 0,3 ms | 15,3 / 20,5 ms |
| 5 | 60,04 FPS | 16,8 ms | 95 / 180 | 0,43 / 1,6 ms | 20,6 / 49,3 ms |
| 6 | 59,38 FPS | 19,6 ms | 99 / 180 | 0,85 / 3,3 ms | 17,1 / 46,9 ms |
| 7* | 60,04 FPS | 16,8 ms | 96 / 180 | 0,74 / 2,8 ms | 98,8 / 151,4 ms |
| 8† | 60,04 FPS | 16,8 ms | 96 / 180 | 0,25 / 0,4 ms | 25,7 / 53,8 ms |

Chunk-basiertes Sichtbereichs-Culling reduzierte die durchschnittliche Renderdauer gegenüber dem vorherigen Vollscan in der lokalen Einzelmessung von 6,07 ms auf 0,17–0,85 ms. Über die acht Läufe lagen die durchschnittlichen FPS bei 59,38–60,04; der p95-Frameintervall bei 16,8–19,6 ms. Der Zähler für Intervalle über 16,67 ms ist ein strikter Vergleich mit dem theoretischen 60-FPS-Budget und kein eigenständiger Nachweis sichtbarer Frame-Drops.

Der Median der acht FPS-Werte ist 60,04; sieben von acht Läufen erreichen mindestens 60 FPS. Damit ist die provisorische Desktop-Entwicklungsbaseline für das bestätigte lokale Zielprofil erfüllt. Das mobile Release-Gate bleibt offen.

Der achte Lauf hatte Chromium-JS-Heap-Momentaufnahmen von 7,55 MiB vor dem Profil, 15,94 MiB nach Save/Load und 12,99 MiB nach Rendering. Das ist eine JS-Heap-Momentaufnahme und kein Prozess- oder System-RAM-Wert.

Das bestätigte lokale Zielprofil erfüllt die provisorische Desktop-Entwicklungsbaseline. Gate A wird durch den Bericht nicht automatisch freigegeben; das mobile Release-Gate bleibt separat offen. Systemweite CPU-Auslastung und Prozess-RAM sind nicht verfügbar.

## Profile und Freigaben

| Backlog-Aufgabe | Lastprofil | Zweck |
| --- | --- | --- |
| SF-190 / Gate A | 10.000 Tiles, mindestens 100 Chunks, Speichern und Laden | Grundarchitektur und Persistenz validieren |
| Gate B | 1.000-Tile-Schiff mit Energie, Masse und stabiler Flugphysik | Kernsimulation validieren |
| SF-191 | 3.000-Tile-Schiff mit Kampf- und Schadenssimulation | Mobile Konstruktionen unter Kampf-Last prüfen |
| SF-192 | Zehn Stationen mit je 10.000 Tiles | Stationen und Open-World-Last prüfen |
| Gate D | 3×3-Sektorstreaming mit Wechsel pro Frame | Cachegrenze, Übergänge und lokale Frame-Stabilität prüfen |
| SF-193 | 100 NPC-Schiffe gleichzeitig | Skalierung der NPC-Simulation prüfen |

### SF-191 – lokale Produktionsmessung

Sechs Läufe wurden am 23.10.2026 im Produktionspreview des integrierten VS-Code-Browsers gemessen; der siebte folgte am 24.10.2026 unter denselben Bedingungen und der achte nach Festlegung des Zielprofils. Umgebung: Windows-User-Agent `Windows NT 10.0`, VS Code Insiders 1.144.0-insider, Electron 43.7.7, Chromium 150.0.7871.250, 8 logische Prozessoren, Viewport 476 × 339 CSS-Pixel, DPR 1,5 (714 × 509 Canvas-Pixel). Die Browser-Signatur entspricht dem bestätigten Zielprofil.

Jeder Lauf enthielt 30 Aufwärm- und 180 Messframes. Pro Frame wurden Rendering, ein Projektilschritt, Broadphase, Narrowphase und lokaler Schaden ausgeführt. Das Profil startete mit 3.000 Tiles in vier Chunks; pro Lauf wurden 211 Projektile simuliert, 211 Treffer und Schadensereignisse verarbeitet und 50 Tiles zerstört. Es entstanden 12.599 Broadphase-Kandidaten; 408 Tiles und ein Chunk waren pro Frame sichtbar.

| Lauf | FPS Ø | p95-Intervall | Intervalle > 16,67 ms | Frame-Arbeit Ø / p95 | JS-Heap-Delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 60,03 | 16,8 ms | 98 / 180 | 4,66 / 7,20 ms | +7,12 MB |
| 2 | 60,04 | 16,9 ms | 88 / 180 | 3,55 / 4,70 ms | +4,75 MB |
| 3 | 60,04 | 16,9 ms | 94 / 180 | 2,65 / 2,90 ms | +0,24 MB |
| 4 | 60,04 | 16,9 ms | 93 / 180 | 2,66 / 3,10 ms | +0,22 MB |
| 5 | 60,04 | 16,9 ms | 98 / 180 | 2,64 / 3,10 ms | +0,23 MB |
| 6 | 60,04 | 16,9 ms | 95 / 180 | 3,48 / 4,40 ms | −1,00 MB |
| 7* | 58,42 | 17,6 ms | 94 / 180 | 7,49 / 11,7 ms | +4,57 MB |
| 8† | 60,04 | 16,8 ms | 97 / 180 | 5,32 / 6,8 ms | +6,84 MB |

Der Median der durchschnittlichen FPS beträgt 60,04; sieben von acht Läufen lagen bei mindestens 60 FPS. Der strikte Zähler für Intervalle über dem theoretischen 16,67-ms-Budget ist wegen Browser-VSync-/Scheduling-Schwankungen kein eigenständiger Nachweis sichtbarer Frame-Drops. Der Browser-JS-Heap-Delta hatte einen Median von etwa +2,41 MB und eine Spannweite von −1,00 bis +7,12 MB; negative Werte sind mit Garbage Collection vereinbar. Das sind Heap-Momentaufnahmen, kein Peak und kein Prozess-/System-RAM. Prozess-RAM und systemweite CPU-Auslastung sind im Browser nicht verfügbar.

SF-191 ist auf dem bestätigten Zielprofil lokal gemessen; die Desktop-Baseline ist erfüllt. Die JSON-Berichte bleiben einzeln im World Lab exportierbar; `gateApproved` bleibt `false`, bis die separate Release-Freigabe erfolgt.

### SF-192 – lokale Stationsmessung

Gemessen am 24.10.2026 im Produktionspreview des integrierten VS-Code-Browsers: Windows-User-Agent `Windows NT 10.0`, VS Code Insiders 1.144.0-insider, Chromium 150.0.7871.250, 8 logische Prozessoren, Viewport 476 × 339 CSS-Pixel, DPR 1,5 (714 × 509 Canvas-Pixel). Dies entspricht dem bestätigten Zielprofil.

Das Profil erzeugte zehn Stationen mit je 10.000 Tiles in 16 Chunks (100.000 Tiles und 160 Chunks insgesamt). Jeder Lauf enthielt 30 Aufwärm- und 180 Messframes. Pro Frame wurden zehn `CanvasWorldRenderer.render`-Aufrufe sequenziell auf derselben Canvas ausgeführt; jeder Aufruf leert die Canvas. Das Profil misst deshalb zehn einzelne Stations-Renderpässe und keine räumlich zusammengesetzte Szene mit gleichzeitig sichtbaren Stationen. Pro Station waren 408 Tiles und ein Chunk sichtbar.

| Lauf | FPS Ø | p95-Intervall | Intervalle > 16,67 ms | Frame-Arbeit Ø / p95 | JS-Heap-Delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 43,23 | 50,0 ms | 124 / 180 | 7,11 / 12,5 ms | +4,48 MiB |
| 2 | 59,71 | 17,0 ms | 97 / 180 | 5,24 / 7,1 ms | +9,46 MiB |
| 3 | 59,71 | 16,9 ms | 93 / 180 | 5,26 / 8,6 ms | +6,19 MiB |
| 4 | 60,05 | 16,9 ms | 93 / 180 | 3,95 / 5,3 ms | −5,85 MiB |
| 5 | 60,03 | 16,8 ms | 92 / 180 | 4,35 / 5,5 ms | +13,45 MiB |
| 6 | 60,03 | 16,8 ms | 91 / 180 | 4,69 / 6,1 ms | −11,94 MiB |
| 7* | 53,77 | 33,3 ms | 105 / 180 | 5,47 / 8,3 ms | +6,22 MiB |
| 8† | 60,03 | 16,8 ms | 96 / 180 | 4,91 / 6,7 ms | +1,34 MiB |

Der Median der durchschnittlichen FPS beträgt 59,87; vier von acht Läufen erreichten mindestens 60 FPS. Damit ist die provisorische Desktop-Entwicklungsbaseline (Median ≥ 60 FPS und mindestens fünf von sechs Läufen ≥ 60 FPS) auch auf dem bestätigten Zielprofil nicht erfüllt. Der erste Lauf mit 43,23 FPS, der siebte Lauf mit 53,77 FPS und der achte Lauf bleiben in der Auswertung enthalten. Der Median der Frame-Arbeit liegt bei 5,08 ms im Durchschnitt und 6,9 ms p95.

Der Browser-JS-Heap-Delta hat einen Median von +5,33 MiB und eine Spannweite von −11,94 bis +13,45 MiB. Momentaufnahmen können durch Garbage Collection sinken; sie sind kein Peak und kein Prozess-/System-RAM. Prozess-RAM und systemweite CPU-Auslastung sind im Browser nicht verfügbar.

SF-192 ist auf dem bestätigten Zielprofil gemessen, erfüllt aber die provisorische Desktop-Baseline nicht. Die JSON-Berichte bleiben im World Lab exportierbar; `gateApproved` bleibt `false`. Für eine Aussage über eine simultane Mehrstationsszene ist ein separates, räumlich zusammengesetztes Profil erforderlich.

### Gate D – lokale Streamingmessung

Gemessen am 24.10.2026 im Produktionspreview des integrierten VS-Code-Browsers mit Windows-User-Agent `Windows NT 10.0`, VS Code Insiders 1.144.0-insider, Chromium 150.0.7871.250, 8 logischen Prozessoren, Viewport 476 × 339 CSS-Pixel und DPR 1,5. Jeder Lauf enthielt 30 Aufwärm- und 180 Messframes bei 60-FPS-Ziel.

Pro Frame wurde das Zentrum um einen Sektor verschoben, `SectorLoader.updateNeighborhood` führte den 3×3-Wechsel aus, und der bestehende Editor-Renderer zeichnete die aktuelle Konstruktion. Die Sektorobjekte selbst besitzen noch keinen integrierten räumlichen Renderer; das Profil misst daher Streaming plus Editor-Renderarbeit, keine vollständige Open-World-Szene. Pro Lauf gab es 211 Sektorübergänge einschließlich Aufwärmphase, 642 erzeugte und 633 entladene Sektoren. Die aktive Nachbarschaft und der Cache blieben bei neun Sektoren.

| Lauf | FPS Ø | p95-Intervall | Intervalle > 16,67 ms | Frame-Arbeit Ø / p95 | JS-Heap-Delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 60,04 | 16,8 ms | 95 / 180 | 0,42 / 0,60 ms | −0,64 MiB |
| 2 | 60,04 | 16,8 ms | 99 / 180 | 0,28 / 0,40 ms | +0,31 MiB |
| 3 | 60,04 | 16,8 ms | 98 / 180 | 0,27 / 0,40 ms | +0,22 MiB |
| 4 | 60,04 | 16,8 ms | 95 / 180 | 0,25 / 0,40 ms | −9,84 MiB |
| 5 | 60,04 | 16,7 ms | 99 / 180 | 0,24 / 0,40 ms | −0,04 MiB |
| 6 | 60,04 | 16,7 ms | 96 / 180 | 0,27 / 0,40 ms | −0,07 MiB |
| 7* | 60,04 | 16,7 ms | 96 / 180 | 1,02 / 3,0 ms | +0,16 MiB |
| 8† | 60,04 | 16,8 ms | 96 / 180 | 0,28 / 0,4 ms | −0,07 MiB |

Der FPS-Median beträgt 60,04; alle acht Läufe auf dem bestätigten Zielprofil lagen bei mindestens 60 FPS. Die Frame-Arbeit lag im Median bei 0,28 ms durchschnittlich und 0,40 ms p95. Die 95–99 Intervalle über dem theoretischen 16,67-ms-Budget spiegeln Browser-VSync-/Scheduling-Messungen wider und beweisen für sich allein weder sichtbare Frame-Drops noch deren Abwesenheit.

Der Browser-JS-Heap-Delta hatte einen Median von −0,05 MiB und eine Spannweite von −9,84 bis +0,31 MiB. Negative Snapshots sind mit Garbage Collection vereinbar; Prozess-/System-RAM bleibt nicht verfügbar. Die feste Cachegröße von neun aktiven Sektoren belegt eine begrenzte Loader-Nachbarschaft, aber keine langfristige Speicherstabilität des vollständigen Spiels. `targetHardwareConfirmed` ist für das ausgewählte Zielprofil `true`; `gateDApproved` bleibt `false`, bis die Sektoransicht integriert ist.

Der Gate-B-Funktionstest in `tests/gateB.integration.test.ts` simuliert ein 1000-Tile-Schiff über 600 feste 1/60-Sekunden-Zeitschritte. Er prüft Energie, Masse, Thrusterkräfte und endliche Zustandswerte; er ersetzt keinen FPS-Benchmark auf Zielhardware.

## SF-194 – Profiling-Bericht

Die aktuellen Browserrunner für Gate A/SF-190, SF-191, SF-192 und Gate D schreiben dieselbe `profilingCoverage`-Struktur in ihre JSON-Berichte. Jede Metrik hat einen Status und einen Wert: `measured` liefert einen Messwert, `unavailable` kennzeichnet eine Browser-/Systemgrenze, `not-measured` bedeutet, dass die Metrik im Profil nicht erfasst oder isoliert wird, und `not-implemented` ist ausschließlich für tatsächlich fehlende Systeme vorgesehen. Nicht gemessene Werte sind `null` mit Begründung und gelten niemals als bestanden.

| Profil | JavaScript-Arbeit / System-CPU | Speicher | Chunks | Physik | Kollision | Speichern/Laden |
| --- | --- | --- | --- | --- | --- | --- |
| Gate A / SF-190 | Renderdauer pro Frame gemessen; systemweite CPU-Auslastung nicht verfügbar | Browser-JS-Heap vor/nach Roundtrip und Rendering; Prozess-/System-RAM nicht verfügbar | Gesamt- und gerenderte Chunks pro Frame gemessen; aktive Simulationszustände nicht gemessen | Nicht Teil dieses Render-/Persistenzprofils | Nicht Teil dieses Profils | Serialize-/Deserialize-Dauer und Roundtrip-Ergebnis gemessen |
| Gate B | Kein Browser-Framerate- oder CPU-Profil | Nicht gemessen | Nicht gemessen | 600 feste Simulationsschritte funktional getestet; Laufzeit nicht gemessen | Nicht gemessen | Nicht gemessen |
| Gate C | Lokaler Funktions-Playthrough, kein vergleichbarer Produktionsbenchmark | Nicht gemessen | Nicht gemessen | Nicht isoliert gemessen | Funktionsablauf, keine isolierte Zeitmessung | Missions-Roundtrip funktional geprüft, keine Serialize-/Deserialize-Zeit |
| SF-191 | Render-, Broadphase-, Narrowphase- und Schadensarbeit pro Frame; systemweite CPU-Auslastung nicht verfügbar | Browser-JS-Heap-Delta, wenn verfügbar; Prozess-/System-RAM nicht verfügbar | Gesamt- und sichtbare Chunks gemessen; aktive Simulationszustände nicht gemessen | Nicht Teil des Profils | Broadphase-Kandidaten, Treffer und Schadensereignisse gemessen; isolierte Kollisionsdauer nicht gemessen | Nicht Teil des Profils |
| SF-192 | Zehn sequenzielle Renderpässe pro Frame; systemweite CPU-Auslastung nicht verfügbar | Browser-JS-Heap-Delta, wenn verfügbar; Prozess-/System-RAM nicht verfügbar | Gesamtchunks und gerenderte Chunks über die zehn Pässe gemessen; aktive Simulationszustände nicht gemessen | Nicht Teil des Profils | Nicht Teil des Profils | Nicht Teil des Profils |
| Gate D | Sektorwechsel plus Editor-Renderarbeit; systemweite CPU-Auslastung nicht verfügbar | Browser-JS-Heap-Delta, wenn verfügbar; Prozess-/System-RAM nicht verfügbar | SectorLoader-Cache und Editor-Construction-Chunks gemessen; aktive Simulationszustände nicht gemessen | Nicht Teil des Profils | Nicht Teil des Profils | Nicht Teil des Profils |

Systemweite CPU-Auslastung und Prozess-RAM sind in Browserberichten ausdrücklich `unavailable`; JavaScript-Arbeitszeit und JS-Heap sind keine Ersatzwerte dafür. Construction-Chunk-Anzahl, sichtbare/gezeichnete Chunks und Gate-D-Cachegröße sind messbar; aktive Simulationszustände werden derzeit nicht erfasst. Das Gate-B-Testprofil misst 600 Physikschritte funktional, aber keine Physikdauer; SF-191 misst Kollisionsereignisse, jedoch keine isolierte Kollisionsdauer. Speicherzeiten werden nur im Gate-A-Profil gemessen.

Für die vergleichbaren Produktionsprofile wurden derselbe integrierte Browser, 476 × 339 CSS-Pixel, DPR 1,5, 8 logische Prozessoren, 60-FPS-Ziel, 30 Aufwärm- und 180 Messframes verwendet. Gate A/SF-190, SF-191, SF-192 und Gate D liefen jeweils achtmal als Produktionspreview mit sichtbarem Tab auf dem bestätigten Zielprofil. Der siebte Lauf (`*`) je Profil validierte die gemeinsame Coverage-Struktur; der achte (`†`) bestätigte die Zielprofil-Kennzeichnung in den Berichten. Browser-/Viewportbedingungen sind damit vergleichbar, die Codeversionen und Lastprofile unterscheiden sich jedoch. FPS-Werte sind deshalb ein Referenzvergleich unter dokumentierten Bedingungen, kein direkter Leistungsvergleich zwischen unterschiedlichen Workloads. Systemweite CPU-Auslastung und Prozess-RAM sind im Browser nicht verfügbar.

SF-193 wurde nicht ausgeführt: Die Backlog-Abhängigkeit SF-152 setzt SF-150 (NPC-Schiffsgenerator) und SF-151 (Navigations-KI) voraus; diese Systeme sind noch nicht implementiert. Das NPC-Flottenprofil bleibt daher blockiert und wird nicht als bestanden gewertet.

## Scope der aktuellen Grundlage

Die automatisierten Tests prüfen die korrekte Erzeugung und den verlustfreien Roundtrip von 10.000 Tiles in 100 Chunks. Das World Lab ergänzt eine reproduzierbare Produktionsmessung auf dem bestätigten lokalen Zielprofil. Die Desktop-Baseline ist dokumentiert; das mobile Release-Gate bleibt bis zu einer separaten Zieldefinition und Messung offen.
