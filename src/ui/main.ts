import './style.css';
import {
  getPlacementPositions,
  isPlacementShape
} from '../editor/placementPatterns';
import type { PlacementShape } from '../editor/placementPatterns';
import {
  runGateABenchmark,
  type GateABenchmarkReport
} from '../benchmark/runGateABenchmark';
import type { TilePosition } from '../core/coordinates';
import {
  isTileOrientation,
  isTileType,
  type TileType,
  type TileOrientation
} from '../core/tiles';
import { calculatePowerBalance } from '../energy/powerBalance';
import { createDemoConstruction } from '../game/createDemoConstruction';
import {
  CanvasWorldRenderer,
  TILE_PIXEL_SIZE
} from '../rendering/canvasWorldRenderer';
import { calculateMomentOfInertia } from '../physics/momentOfInertia';
import {
  deserializeConstruction,
  serializeConstruction
} from '../save/serialization';

const SAVE_KEY = 'stellar-frontier:construction:v2';
const LEGACY_SAVE_KEY = 'stellar-frontier:construction:v1';

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
const tileOrientationSelect = requireElement(
  document.querySelector<HTMLSelectElement>('#tile-orientation'),
  '#tile-orientation'
);
const placementShapeSelect = requireElement(
  document.querySelector<HTMLSelectElement>('#placement-shape'),
  '#placement-shape'
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
const exportBlueprintButton = requireElement(
  document.querySelector<HTMLButtonElement>('#export-blueprint'),
  '#export-blueprint'
);
const downloadBlueprintLink = requireElement(
  document.querySelector<HTMLAnchorElement>('#download-blueprint'),
  '#download-blueprint'
);
const importBlueprintButton = requireElement(
  document.querySelector<HTMLButtonElement>('#import-blueprint'),
  '#import-blueprint'
);
const blueprintFileInput = requireElement(
  document.querySelector<HTMLInputElement>('#blueprint-file'),
  '#blueprint-file'
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
const totalMassElement = requireElement(
  document.querySelector<HTMLElement>('#total-mass'),
  '#total-mass'
);
const centerOfMassElement = requireElement(
  document.querySelector<HTMLElement>('#center-of-mass'),
  '#center-of-mass'
);
const momentOfInertiaElement = requireElement(
  document.querySelector<HTMLElement>('#moment-of-inertia'),
  '#moment-of-inertia'
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
const constructionControls: Array<
  HTMLButtonElement | HTMLInputElement | HTMLSelectElement
> = [
  tileTypeSelect,
  tileOrientationSelect,
  placementShapeSelect,
  placeModeButton,
  eraseModeButton,
  saveButton,
  loadButton,
  exportBlueprintButton,
  importBlueprintButton,
  blueprintFileInput,
  resetButton
];

type EditMode = 'place' | 'erase';

let construction = createDemoConstruction();
let editMode: EditMode = 'place';
let connectedComponentCount = construction.getConnectedComponents().length;
let benchmarkRunning = false;
let benchmarkReportUrl: string | undefined;
let blueprintDownloadUrl: string | undefined;
let dragPlacement:
  | {
      readonly pointerId: number;
      readonly start: TilePosition;
      readonly settings: PlacementSettings;
    }
  | undefined;

interface PlacementSettings {
  readonly type: TileType;
  readonly orientation: TileOrientation;
  readonly shape: PlacementShape;
}

function refreshWorld(): void {
  disableBlueprintDownload();
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
  const physicalProperties = calculateMomentOfInertia(construction);
  totalMassElement.textContent =
    physicalProperties.totalMass.toLocaleString('de-DE');
  centerOfMassElement.textContent =
    physicalProperties.centerOfMass === null
      ? '—'
      : `${physicalProperties.centerOfMass.x.toFixed(2)}, ${physicalProperties.centerOfMass.y.toFixed(2)}`;
  momentOfInertiaElement.textContent =
    physicalProperties.momentOfInertia.toLocaleString('de-DE');
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

  if (!enabled) {
    disableBlueprintDownload();
  }

  updateOrientationControl();
}

function updateOrientationControl(): void {
  tileOrientationSelect.disabled =
    benchmarkRunning || tileTypeSelect.value !== 'thruster';
}

function readPlacementSettings(): PlacementSettings | undefined {
  const selectedType: string = tileTypeSelect.value;
  const selectedShape: string = placementShapeSelect.value;

  if (!isTileType(selectedType)) {
    statusElement.textContent = 'Der ausgewählte Tile-Typ ist ungültig.';
    return undefined;
  }

  if (!isPlacementShape(selectedShape)) {
    statusElement.textContent = 'Die Platzierungsform ist ungültig.';
    return undefined;
  }

  let orientation: TileOrientation = 'north';

  if (selectedType === 'thruster') {
    const selectedOrientation: string = tileOrientationSelect.value;

    if (!isTileOrientation(selectedOrientation)) {
      statusElement.textContent = 'Die Thruster-Richtung ist ungültig.';
      return undefined;
    }

    orientation = selectedOrientation;
  }

  return {
    type: selectedType,
    orientation,
    shape: selectedShape
  };
}

function canvasPositionAt(event: PointerEvent): TilePosition {
  const bounds = canvas.getBoundingClientRect();
  const columns = Math.max(1, Math.ceil(canvas.clientWidth / TILE_PIXEL_SIZE));
  const rows = Math.max(1, Math.ceil(canvas.clientHeight / TILE_PIXEL_SIZE));
  const x = Math.floor(
    (event.clientX - bounds.left - canvas.clientLeft) / TILE_PIXEL_SIZE
  );
  const y = Math.floor(
    (event.clientY - bounds.top - canvas.clientTop) / TILE_PIXEL_SIZE
  );

  return {
    x: Math.min(columns - 1, Math.max(0, x)),
    y: Math.min(rows - 1, Math.max(0, y))
  };
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

function disableBlueprintDownload(): void {
  if (blueprintDownloadUrl !== undefined) {
    URL.revokeObjectURL(blueprintDownloadUrl);
    blueprintDownloadUrl = undefined;
  }

  downloadBlueprintLink.href = '#';
  downloadBlueprintLink.removeAttribute('download');
  downloadBlueprintLink.setAttribute('aria-disabled', 'true');
  downloadBlueprintLink.tabIndex = -1;
}

function enableBlueprintDownload(): void {
  disableBlueprintDownload();

  const safeConstructionId = construction.id.replace(
    /[^A-Za-z0-9_-]+/g,
    '-'
  );
  const blueprintBlob = new Blob([serializeConstruction(construction)], {
    type: 'application/json'
  });
  blueprintDownloadUrl = URL.createObjectURL(blueprintBlob);
  downloadBlueprintLink.href = blueprintDownloadUrl;
  downloadBlueprintLink.download =
    `stellar-frontier-${safeConstructionId}.json`;
  downloadBlueprintLink.removeAttribute('aria-disabled');
  downloadBlueprintLink.tabIndex = 0;
  statusElement.textContent = 'Blueprint ist bereit. JSON herunterladen auswählen.';
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

  const position = canvasPositionAt(event);
  const shouldErase = editMode === 'erase' || event.button === 2;

  if (shouldErase) {
    dragPlacement = undefined;
    const removed = construction.removeTile(position);
    statusElement.textContent =
      removed === undefined
        ? 'An dieser Position liegt kein Tile.'
        : `${removed.type} entfernt.`;
    refreshWorld();
    return;
  }

  const settings = readPlacementSettings();

  if (settings === undefined) {
    return;
  }

  if (settings.shape === 'single') {
    const placed = construction.placeTile(
      position,
      settings.type,
      settings.orientation
    );
    statusElement.textContent = `${placed.type} bei (${position.x}, ${position.y}) platziert.`;
    refreshWorld();
    return;
  }

  dragPlacement = {
    pointerId: event.pointerId,
    start: position,
    settings
  };
  canvas.setPointerCapture(event.pointerId);
  statusElement.textContent = 'Ziehe bis zum Endpunkt der Mehrfachplatzierung.';
}

function handleCanvasPointerUp(event: PointerEvent): void {
  if (benchmarkRunning || dragPlacement?.pointerId !== event.pointerId) {
    return;
  }

  const placement = dragPlacement;
  dragPlacement = undefined;

  if (placement === undefined) {
    return;
  }

  const positions = getPlacementPositions(
    placement.start,
    canvasPositionAt(event),
    placement.settings.shape
  );

  for (const position of positions) {
    construction.placeTile(
      position,
      placement.settings.type,
      placement.settings.orientation
    );
  }

  statusElement.textContent =
    `${positions.length.toLocaleString('de-DE')} Tiles als ` +
    `${placement.settings.shape === 'line' ? 'Linie' : 'Rechteck'} platziert.`;
  refreshWorld();
}

canvas.addEventListener('pointerdown', handleCanvasPointerDown);
canvas.addEventListener('pointerup', handleCanvasPointerUp);
canvas.addEventListener('pointercancel', (event) => {
  if (dragPlacement?.pointerId === event.pointerId) {
    dragPlacement = undefined;
    statusElement.textContent = 'Mehrfachplatzierung abgebrochen.';
  }
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
placeModeButton.addEventListener('click', () => setEditMode('place'));
eraseModeButton.addEventListener('click', () => setEditMode('erase'));
tileTypeSelect.addEventListener('change', updateOrientationControl);
placementShapeSelect.addEventListener('change', () => {
  if (!isPlacementShape(placementShapeSelect.value)) {
    statusElement.textContent = 'Die Platzierungsform ist ungültig.';
  }
});
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
    const savedConstruction =
      localStorage.getItem(SAVE_KEY) ??
      localStorage.getItem(LEGACY_SAVE_KEY);

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

exportBlueprintButton.addEventListener('click', () => {
  try {
    enableBlueprintDownload();
  } catch (error) {
    statusElement.textContent =
      `Blueprint-Export fehlgeschlagen: ${showError(error)}`;
  }
});

importBlueprintButton.addEventListener('click', () => {
  blueprintFileInput.click();
});

blueprintFileInput.addEventListener('change', async () => {
  const blueprintFile = blueprintFileInput.files?.item(0);

  if (blueprintFile === null || blueprintFile === undefined) {
    return;
  }

  try {
    const serialized = await blueprintFile.text();
    construction = deserializeConstruction(
      serialized,
      construction.tileRegistry
    );
    statusElement.textContent = `Blueprint "${blueprintFile.name}" geladen.`;
    refreshWorld();
  } catch (error) {
    statusElement.textContent =
      `Blueprint-Import fehlgeschlagen: ${showError(error)}`;
  } finally {
    blueprintFileInput.value = '';
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

downloadBlueprintLink.addEventListener('click', (event) => {
  if (downloadBlueprintLink.getAttribute('aria-disabled') === 'true') {
    event.preventDefault();
    statusElement.textContent = 'Bitte stelle zuerst einen Blueprint bereit.';
    return;
  }

  statusElement.textContent = 'Blueprint wird heruntergeladen.';
});

window.addEventListener('pagehide', disableBenchmarkDownload, { once: true });
window.addEventListener('pagehide', disableBlueprintDownload, { once: true });

setEditMode('place');
updateOrientationControl();
refreshWorld();
