import {
  chunkKey,
  chunkPositionForTile
} from '../core/coordinates';
import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';

export interface ChunkMass {
  readonly position: ChunkPosition;
  readonly tileCount: number;
  readonly totalMass: number;
}

export interface ConstructionMassReport {
  readonly tileCount: number;
  readonly totalMass: number;
  readonly chunks: readonly ChunkMass[];
}

interface MutableChunkMass {
  readonly position: ChunkPosition;
  tileCount: number;
  totalMass: number;
}

export function calculateConstructionMass(
  construction: Construction
): ConstructionMassReport {
  const chunks = new Map<string, MutableChunkMass>();

  for (const { position, tile } of construction.iterateTiles()) {
    if (!Number.isFinite(tile.hp) || tile.hp < 0) {
      throw new RangeError(`Invalid HP for tile ID ${tile.id}.`);
    }

    if (tile.hp === 0) {
      continue;
    }

    if (!Number.isFinite(tile.mass) || tile.mass < 0) {
      throw new RangeError(`Invalid mass for tile ID ${tile.id}.`);
    }

    const chunkPosition = chunkPositionForTile(position);
    const key = chunkKey(chunkPosition);
    const current = chunks.get(key);

    if (current === undefined) {
      chunks.set(key, {
        position: chunkPosition,
        tileCount: 1,
        totalMass: tile.mass
      });
      continue;
    }

    const updatedMass = current.totalMass + tile.mass;

    if (!Number.isFinite(updatedMass)) {
      throw new RangeError(`Mass overflow in chunk ${key}.`);
    }

    current.tileCount += 1;
    current.totalMass = updatedMass;
  }

  const chunkReports = Array.from(chunks.values()).sort(
    (left, right) =>
      left.position.y - right.position.y ||
      left.position.x - right.position.x
  );
  const totalMass = chunkReports.reduce(
    (total, chunk) => total + chunk.totalMass,
    0
  );

  if (!Number.isFinite(totalMass)) {
    throw new RangeError('Construction mass overflow.');
  }

  return {
    tileCount: chunkReports.reduce(
      (total, chunk) => total + chunk.tileCount,
      0
    ),
    totalMass,
    chunks: chunkReports
  };
}
