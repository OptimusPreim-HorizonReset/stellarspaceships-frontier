import './style.css';
import { isTileType } from '../core/tiles';
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
const statusElement = requireElement(
  document.querySelector<HTMLElement>('#status'),
  '#status'
);
const renderer = new CanvasWorldRenderer(canvas);

type EditMode = 'place' | 'erase';

let construction = createDemoConstruction();
let editMode: EditMode = 'place';
let connectedComponentCount = construction.getConnectedComponents().length;

function refreshWorld(): void {
  connectedComponentCount = construction.getConnectedComponents().length;
  renderer.render(construction);
  tileCountElement.textContent = construction.tileCount.toLocaleString('de-DE');
  chunkCountElement.textContent = construction.chunkCount.toLocaleString('de-DE');
  componentCountElement.textContent =
    connectedComponentCount.toLocaleString('de-DE');
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

function handleCanvasPointerDown(event: PointerEvent): void {
  if (event.button !== 0 && event.button !== 2) {
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

setEditMode('place');
refreshWorld();
