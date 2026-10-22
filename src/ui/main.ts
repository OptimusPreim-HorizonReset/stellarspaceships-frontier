import './style.css';
import {
  runGateABenchmark,
  type GateABenchmarkReport
} from '../benchmark/runGateABenchmark';
import { isTileType } from '../core/tiles';
import { calculatePowerBalance } from '../energy/powerBalance';
import { createDemoConstruction } from '../game/createDemoConstruction';
import {
  CanvasWorldRenderer,
  TILE_PIXEL_SIZE
} from '../rendering/canvasWorldRenderer';
import {
  deserializeConstruction,
  serializeConstruction
} from '../save/serialization';

const SAVE_KEY = 'stellar-frontier:construction:v1';

function requireElement<T extends Element>(
  element: T | null,
  selector: string
): T {
  if (element === null) {
    throw new Error(`World Lab is missing the ${selector} element.`);
  }

  return element;
}

const canvas = requireElement(
  document.querySelector<HTMLCanvasElement>('#world-canvas'),
  '#world-canvas'
);
const tileTypeSelect = requireElement(
  document.querySelector<HTMLSelectElement>('#tile-type'),
  '#tile-type'
);
const placeModeButton = requireElement(
  document.querySelector<HTMLButtonElement>('#place-mode'),
  '#place-mode'
);
const eraseModeButton = requireElement(
  document.querySelector<HTMLButtonElement>('#erase-mode'),
  '#erase-mode'
);
const saveButton = requireElement(
  document.querySelector<HTMLButtonElement>('#save-world'),
  '#save-world'
);
const loadButton = requireElement(
  document.querySelector<HTMLButtonElement>('#load-world'),
  '#load-world'
);
const resetButton = requireElement(
  document.querySelector<HTMLButtonElement>('#reset-world'),
  '#reset-world'
);
const tileCountElement = requireElement(
  document.querySelector<HTMLElement>('#tile-count'),
  '#tile-count'
);
const chunkCountElement = requireElement(
  document.querySelector<HTMLElement>('#chunk-count'),
  '#chunk-count'
);
const componentCountElement = requireElement(
  document.querySelector<HTMLElement>('#component-count'),
  '#component-count'
);
const powerGenerationElement = requireElement(
  document.querySelector<HTMLElement>('#power-generation'),
  '#power-generation'
);
const powerConsumptionElement = requireElement(
  document.querySelector<HTMLElement>('#power-consumption'),
  '#power-consumption'
);
const netPowerElement = requireElement(
  document.querySelector<HTMLElement>('#net-power'),
  '#net-power'
);
const statusElement = requireElement(
  document.querySelector<HTMLElement>('#status'),
  '#status'
);
const runBenchmarkButton = requireElement(
  document.querySelector<HTMLButtonElement>('#run-gate-a'),
  '#run-gate-a'
);
const downloadBenchmarkLink = requireElement(
  document.querySelector<HTMLAnchorElement>('#download-benchmark'),
  '#download-benchmark'
);
const benchmarkSummaryElement = requireElement(
  document.querySelector<HTMLElement>('#benchmark-summary'),
  '#benchmark-summary'
);
const benchmarkReportElement = requireElement(
  document.querySelector<HTMLElement>('#benchmark-report'),
  '#benchmark-report'
);
const renderer = new CanvasWorldRenderer(canvas);
const constructionControls: Array<HTMLButtonElement | HTMLSelectElement> = [
  tileTypeSelect,
  placeModeButton,
  eraseModeButton,
  saveButton,
  loadButton,
  resetButton
];

type EditMode = 'place' | 'erase';

let construction = createDemoConstruction();
let editMode: EditMode = 'place';
let connectedComponentCount = construction.getConnectedComponents().length;
let benchmarkRunning = false;
let benchmarkReportUrl: string | undefined;

function refreshWorld(): void {
  connectedComponentCount = construction.getConnectedComponents().length;
  renderer.render(construction);
  tileCountElement.textContent = construction.tileCount.toLocaleString('de-DE');
  chunkCountElement.textContent = construction.chunkCount.toLocaleString('de-DE');
  componentCountElement.textContent =
    connectedComponentCount.toLocaleString('de-DE');
  const powerBalance = calculatePowerBalance(construction);
  powerGenerationElement.textContent =
    powerBalance.totalPowerGeneration.toLocaleString(
      'de-DE'
    );
  powerConsumptionElement.textContent =
    powerBalance.totalPowerConsumption.toLocaleString(
      'de-DE'
    );
  netPowerElement.textContent =
    powerBalance.totalNetPower.toLocaleString(
      'de-DE'
    );
}

function showError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function setEditMode(mode: EditMode): void {
  editMode = mode;
  const isPlacing = mode === 'place';

  placeModeButton.classList.toggle('is-selected', isPlacing);
  placeModeButton.setAttribute('aria-pressed', String(isPlacing));
  eraseModeButton.classList.toggle('is-selected', !isPlacing);
  eraseModeButton.setAttribute('aria-pressed', String(!isPlacing));
  canvas.dataset.mode = mode;
}

function setConstructionControlsEnabled(enabled: boolean): void {
  for (const control of constructionControls) {
    control.disabled = !enabled;
  }
}

function disableBenchmarkDownload(): void {
  if (benchmarkReportUrl !== undefined) {
    URL.revokeObjectURL(benchmarkReportUrl);
    benchmarkReportUrl = undefined;
  }

  downloadBenchmarkLink.href = '#';
  downloadBenchmarkLink.removeAttribute('download');
  downloadBenchmarkLink.setAttribute('aria-disabled', 'true');
  downloadBenchmarkLink.tabIndex = -1;
}

function enableBenchmarkDownload(report: GateABenchmarkReport): void {
  disableBenchmarkDownload();

  const reportBlob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json'
  });
  benchmarkReportUrl = URL.createObjectURL(reportBlob);
  downloadBenchmarkLink.href = benchmarkReportUrl;
  downloadBenchmarkLink.download =
    `stellar-frontier-gate-a-${new Date()
      .toISOString()
      .replaceAll(':', '-')}.json`;
  downloadBenchmarkLink.removeAttribute('aria-disabled');
  downloadBenchmarkLink.tabIndex = 0;
}

function handleCanvasPointerDown(event: PointerEvent): void {
  if (benchmarkRunning || (event.button !== 0 && event.button !== 2)) {
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  const position = {
    x: Math.floor((event.clientX - bounds.left) / TILE_PIXEL_SIZE),
    y: Math.floor((event.clientY - bounds.top) / TILE_PIXEL_SIZE)
  };
  const shouldErase = editMode === 'erase' || event.button === 2;

  if (shouldErase) {
    const removed = construction.removeTile(position);
    statusElement.textContent =
      removed === undefined
        ? 'An dieser Position liegt kein Tile.'
        : `${removed.type} entfernt.`;
  } else {
    const selectedType: string = tileTypeSelect.value;

    if (!isTileType(selectedType)) {
      statusElement.textContent = 'Der ausgewählte Tile-Typ ist ungültig.';
      return;
    }

    const placed = construction.placeTile(position, selectedType);
    statusElement.textContent = `${placed.type} bei (${position.x}, ${position.y}) platziert.`;
  }

  refreshWorld();
}

canvas.addEventListener('pointerdown', handleCanvasPointerDown);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
placeModeButton.addEventListener('click', () => setEditMode('place'));
eraseModeButton.addEventListener('click', () => setEditMode('erase'));
window.addEventListener('resize', () => renderer.render(construction));

saveButton.addEventListener('click', () => {
  try {
    localStorage.setItem(SAVE_KEY, serializeConstruction(construction));
    statusElement.textContent = 'Konstruktion lokal gespeichert.';
  } catch (error) {
    statusElement.textContent = `Speichern fehlgeschlagen: ${showError(error)}`;
  }
});

loadButton.addEventListener('click', () => {
  try {
    const savedConstruction = localStorage.getItem(SAVE_KEY);

    if (savedConstruction === null) {
      statusElement.textContent = 'Es ist noch keine Konstruktion gespeichert.';
      return;
    }

    construction = deserializeConstruction(savedConstruction, construction.tileRegistry);
    statusElement.textContent = 'Konstruktion geladen.';
    refreshWorld();
  } catch (error) {
    statusElement.textContent = `Laden fehlgeschlagen: ${showError(error)}`;
  }
});

resetButton.addEventListener('click', () => {
  construction = createDemoConstruction();
  statusElement.textContent = 'Beispielkonstruktion wiederhergestellt.';
  refreshWorld();
});

runBenchmarkButton.addEventListener('click', async () => {
  if (benchmarkRunning) {
    return;
  }

  benchmarkRunning = true;
  runBenchmarkButton.disabled = true;
  disableBenchmarkDownload();
  setConstructionControlsEnabled(false);
  benchmarkSummaryElement.textContent =
    'Erzeuge das Gate-A-Lastprofil und messe 180 Frames nach dem Aufwärmen …';
  benchmarkReportElement.textContent = 'Benchmark läuft …';
  statusElement.textContent =
    'Benchmark läuft. Die Konstruktionsfläche ist währenddessen gesperrt.';

  try {
    const report = await runGateABenchmark(
      canvas,
      renderer,
      import.meta.env.MODE
    );

    benchmarkReportElement.textContent = JSON.stringify(report, null, 2);
    const visibleChunkCount =
      report.profiling.chunks.renderedChunksPerFrame;
    const visibleChunkLabel = visibleChunkCount === 1 ? 'Chunk' : 'Chunks';
    benchmarkSummaryElement.textContent =
      `${report.rendering.averageFps} FPS Ø · ` +
      `${report.workload.visibleTilesPerFrame} sichtbare Tiles / ` +
      `${visibleChunkCount} ${visibleChunkLabel} pro Frame · ` +
      `p95 ${report.rendering.p95FrameIntervalMs} ms · ` +
      `${report.rendering.framesOverBudget} Frames über dem 60-FPS-Budget.`;
    statusElement.textContent = report.rendering.averageFpsTargetMet
      ? 'Die lokale Messung erreicht 60 FPS; Gate A bleibt bis zur Bestätigung der Zielhardware offen.'
      : 'Die lokale Messung unterschreitet 60 FPS; Gate A bleibt offen.';

    try {
      enableBenchmarkDownload(report);
    } catch (error) {
      statusElement.textContent =
        `Messung abgeschlossen, JSON-Export fehlgeschlagen: ${showError(error)}`;
    }
  } catch (error) {
    const message = showError(error);
    benchmarkReportElement.textContent = `Benchmark fehlgeschlagen: ${message}`;
    benchmarkSummaryElement.textContent = `Messung fehlgeschlagen: ${message}`;
    statusElement.textContent = `Benchmark fehlgeschlagen: ${message}`;
  } finally {
    benchmarkRunning = false;
    runBenchmarkButton.disabled = false;
    setConstructionControlsEnabled(true);
    refreshWorld();
  }
});

downloadBenchmarkLink.addEventListener('click', (event) => {
  if (downloadBenchmarkLink.getAttribute('aria-disabled') === 'true') {
    event.preventDefault();
    statusElement.textContent = 'Es liegt noch kein Benchmarkbericht vor.';
    return;
  }

  statusElement.textContent = 'Benchmarkbericht wird heruntergeladen.';
});

window.addEventListener('pagehide', disableBenchmarkDownload, { once: true });

setEditMode('place');
refreshWorld();
