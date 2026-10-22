import { SAVE_FORMAT_VERSION } from '../core/config';
import type { TilePosition } from '../core/coordinates';
import {
  isTileType,
  isTileOrientation,
  type Tile,
  type TileRegistry
} from '../core/tiles';
import { Construction } from '../construction/construction';

interface SavedTile {
  readonly x: number;
  readonly y: number;
  readonly id: number;
  readonly type: string;
  readonly hp: number;
  readonly orientation: unknown;
}

interface SavedConstruction {
  readonly version: number;
  readonly id: string;
  readonly tiles: readonly SavedTile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireSafeInteger(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be a safe integer.`);
  }

  return value;
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return value;
}

function parseSavedConstruction(value: unknown): SavedConstruction {
  if (!isRecord(value)) {
    throw new TypeError('Construction save must be a JSON object.');
  }

  const version = requireSafeInteger(value.version, 'Save version');

  if (version !== 1 && version !== SAVE_FORMAT_VERSION) {
    throw new RangeError(`Unsupported construction save version: ${version}.`);
  }

  const id = requireString(value.id, 'Construction ID');

  if (!Array.isArray(value.tiles)) {
    throw new TypeError('Construction save must contain a tiles array.');
  }

  const tiles = value.tiles.map((entry, index): SavedTile => {
    if (!isRecord(entry)) {
      throw new TypeError(`Tile entry ${index} must be a JSON object.`);
    }

    const { x, y, id: tileId, type, hp, orientation } = entry;

    if (typeof type !== 'string') {
      throw new TypeError(`Tile type at index ${index} must be a string.`);
    }

    if (typeof hp !== 'number' || !Number.isFinite(hp)) {
      throw new TypeError(`Tile HP at index ${index} must be a finite number.`);
    }

    return {
      x: requireSafeInteger(x, `Tile ${index} x coordinate`),
      y: requireSafeInteger(y, `Tile ${index} y coordinate`),
      id: requireSafeInteger(tileId, `Tile ${index} ID`),
      type,
      hp,
      orientation
    };
  });

  return { version, id, tiles };
}

export function serializeConstruction(construction: Construction): string {
  const save: SavedConstruction = {
    version: SAVE_FORMAT_VERSION,
    id: construction.id,
    tiles: construction.getTiles().map(({ position, tile }) => ({
      x: position.x,
      y: position.y,
      id: tile.id,
      type: tile.type,
      hp: tile.hp,
      orientation: tile.orientation
    }))
  };

  return JSON.stringify(save);
}

export function deserializeConstruction(
  serialized: string,
  tileRegistry: TileRegistry
): Construction {
  const parsed: unknown = JSON.parse(serialized);
  const save = parseSavedConstruction(parsed);
  const construction = new Construction(save.id, tileRegistry);

  for (const savedTile of save.tiles) {
    if (!isTileType(savedTile.type)) {
      throw new TypeError(`Unknown tile type: ${savedTile.type}.`);
    }

    const definition = tileRegistry.get(savedTile.type);

    if (definition === undefined) {
      throw new TypeError(`Tile type is not registered: ${savedTile.type}.`);
    }

    const orientation =
      save.version === 1 ? 'north' : savedTile.orientation;

    if (!isTileOrientation(orientation)) {
      throw new TypeError(
        `Unknown tile orientation: ${String(savedTile.orientation)}.`
      );
    }

    const position: TilePosition = { x: savedTile.x, y: savedTile.y };
    const tile: Tile = {
      id: savedTile.id,
      type: savedTile.type,
      orientation,
      hp: savedTile.hp,
      armor: definition.armor,
      mass: definition.mass
    };

    construction.importTile(position, tile);
  }

  return construction;
}
