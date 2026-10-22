import {
  chunkKey,
  chunkPositionForTile
} from '../core/coordinates';
import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';

export interface ChunkPowerGeneration {
  readonly position: ChunkPosition;
  readonly generatorCount: number;
  readonly powerGeneration: number;
}

export interface PowerGenerationReport {
  readonly generatorCount: number;
  readonly totalPowerGeneration: number;
  readonly chunks: readonly ChunkPowerGeneration[];
}

interface MutableChunkPowerGeneration {
  readonly position: ChunkPosition;
  generatorCount: number;
  powerGeneration: number;
}

export function calculatePowerGeneration(
  construction: Construction
): PowerGenerationReport {
  const chunks = new Map<string, MutableChunkPowerGeneration>();

  for (const { position, tile } of construction.iterateTiles()) {
    if (!Number.isFinite(tile.hp) || tile.hp < 0) {
      throw new RangeError(`Invalid HP for tile ID ${tile.id}.`);
    }

    if (tile.hp === 0) {
      continue;
    }

    const definition = construction.tileRegistry.get(tile.type);

    if (definition === undefined) {
      throw new TypeError(`Tile type is not registered: ${tile.type}.`);
    }

    if (definition.powerGeneration === 0) {
      continue;
    }

    const chunkPosition = chunkPositionForTile(position);
    const key = chunkKey(chunkPosition);
    const current = chunks.get(key);

    if (current === undefined) {
      chunks.set(key, {
        position: chunkPosition,
        generatorCount: 1,
        powerGeneration: definition.powerGeneration
      });
      continue;
    }

    const updatedGeneration =
      current.powerGeneration + definition.powerGeneration;

    if (!Number.isFinite(updatedGeneration)) {
      throw new RangeError(`Power generation overflow in chunk ${key}.`);
    }

    current.generatorCount += 1;
    current.powerGeneration = updatedGeneration;
  }

  const chunkReports = Array.from(chunks.values()).sort(
    (left, right) =>
      left.position.y - right.position.y ||
      left.position.x - right.position.x
  );
  const totalPowerGeneration = chunkReports.reduce(
    (total, chunk) => total + chunk.powerGeneration,
    0
  );

  if (!Number.isFinite(totalPowerGeneration)) {
    throw new RangeError('Total power generation overflow.');
  }

  return {
    generatorCount: chunkReports.reduce(
      (total, chunk) => total + chunk.generatorCount,
      0
    ),
    totalPowerGeneration,
    chunks: chunkReports
  };
}
