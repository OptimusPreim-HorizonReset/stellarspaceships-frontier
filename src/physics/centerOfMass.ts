import {
  chunkKey,
  chunkPositionForTile
} from '../core/coordinates';
import type { ChunkPosition, TilePosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';

export interface CenterOfMassPoint {
  readonly x: number;
  readonly y: number;
}

export interface ChunkCenterOfMass {
  readonly position: ChunkPosition;
  readonly totalMass: number;
  readonly centerOfMass: CenterOfMassPoint;
}

export interface ConstructionCenterOfMassReport {
  readonly totalMass: number;
  readonly centerOfMass: CenterOfMassPoint | null;
  readonly chunks: readonly ChunkCenterOfMass[];
}

interface MutableChunkCenterOfMass {
  readonly position: ChunkPosition;
  totalMass: number;
  weightedX: number;
  weightedY: number;
}

function tileCenter(position: TilePosition): CenterOfMassPoint {
  return { x: position.x + 0.5, y: position.y + 0.5 };
}

export function calculateCenterOfMass(
  construction: Construction
): ConstructionCenterOfMassReport {
  const chunks = new Map<string, MutableChunkCenterOfMass>();

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

    if (tile.mass === 0) {
      continue;
    }

    const chunkPosition = chunkPositionForTile(position);
    const key = chunkKey(chunkPosition);
    const center = tileCenter(position);
    const current = chunks.get(key) ?? {
      position: chunkPosition,
      totalMass: 0,
      weightedX: 0,
      weightedY: 0
    };
    const updatedMass = current.totalMass + tile.mass;
    const updatedWeightedX = current.weightedX + tile.mass * center.x;
    const updatedWeightedY = current.weightedY + tile.mass * center.y;

    if (
      !Number.isFinite(updatedMass) ||
      !Number.isFinite(updatedWeightedX) ||
      !Number.isFinite(updatedWeightedY)
    ) {
      throw new RangeError(`Center-of-mass overflow in chunk ${key}.`);
    }

    current.totalMass = updatedMass;
    current.weightedX = updatedWeightedX;
    current.weightedY = updatedWeightedY;
    chunks.set(key, current);
  }

  const chunkReports = Array.from(chunks.values())
    .sort(
      (left, right) =>
        left.position.y - right.position.y ||
        left.position.x - right.position.x
    )
    .map((chunk): ChunkCenterOfMass => ({
      position: chunk.position,
      totalMass: chunk.totalMass,
      centerOfMass: {
        x: chunk.weightedX / chunk.totalMass,
        y: chunk.weightedY / chunk.totalMass
      }
    }));
  const totalMass = chunkReports.reduce(
    (total, chunk) => total + chunk.totalMass,
    0
  );

  if (!Number.isFinite(totalMass)) {
    throw new RangeError('Construction mass overflow.');
  }

  if (totalMass === 0) {
    return { totalMass: 0, centerOfMass: null, chunks: [] };
  }

  const weightedX = chunkReports.reduce(
    (total, chunk) => total + chunk.centerOfMass.x * chunk.totalMass,
    0
  );
  const weightedY = chunkReports.reduce(
    (total, chunk) => total + chunk.centerOfMass.y * chunk.totalMass,
    0
  );

  if (!Number.isFinite(weightedX) || !Number.isFinite(weightedY)) {
    throw new RangeError('Construction center-of-mass overflow.');
  }

  return {
    totalMass,
    centerOfMass: {
      x: weightedX / totalMass,
      y: weightedY / totalMass
    },
    chunks: chunkReports
  };
}
