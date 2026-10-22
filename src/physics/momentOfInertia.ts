import {
  chunkKey,
  chunkPositionForTile
} from '../core/coordinates';
import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';
import { calculateCenterOfMass } from './centerOfMass';

const UNIT_TILE_SQUARE_INERTIA_RATIO = 1 / 6;

export interface ChunkMomentOfInertia {
  readonly position: ChunkPosition;
  readonly momentOfInertia: number;
}

export interface ConstructionMomentOfInertiaReport {
  readonly totalMass: number;
  readonly centerOfMass: {
    readonly x: number;
    readonly y: number;
  } | null;
  readonly momentOfInertia: number;
  readonly chunks: readonly ChunkMomentOfInertia[];
}

interface MutableChunkMomentOfInertia {
  readonly position: ChunkPosition;
  momentOfInertia: number;
}

export function calculateMomentOfInertia(
  construction: Construction
): ConstructionMomentOfInertiaReport {
  const massReport = calculateCenterOfMass(construction);

  if (massReport.centerOfMass === null) {
    return {
      totalMass: 0,
      centerOfMass: null,
      momentOfInertia: 0,
      chunks: []
    };
  }

  const chunks = new Map<string, MutableChunkMomentOfInertia>();
  const center = massReport.centerOfMass;

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

    const dx = position.x + 0.5 - center.x;
    const dy = position.y + 0.5 - center.y;
    const pointMassMoment =
      tile.mass * (dx * dx + dy * dy);
    const tileSelfMoment = tile.mass * UNIT_TILE_SQUARE_INERTIA_RATIO;
    const contribution = pointMassMoment + tileSelfMoment;

    if (!Number.isFinite(contribution)) {
      throw new RangeError(`Inertia overflow for tile ID ${tile.id}.`);
    }

    const chunkPosition = chunkPositionForTile(position);
    const key = chunkKey(chunkPosition);
    const current = chunks.get(key) ?? {
      position: chunkPosition,
      momentOfInertia: 0
    };
    const updatedMoment = current.momentOfInertia + contribution;

    if (!Number.isFinite(updatedMoment)) {
      throw new RangeError(`Inertia overflow in chunk ${key}.`);
    }

    current.momentOfInertia = updatedMoment;
    chunks.set(key, current);
  }

  const chunkReports = Array.from(chunks.values()).sort(
    (left, right) =>
      left.position.y - right.position.y ||
      left.position.x - right.position.x
  );
  const momentOfInertia = chunkReports.reduce(
    (total, chunk) => total + chunk.momentOfInertia,
    0
  );

  if (!Number.isFinite(momentOfInertia)) {
    throw new RangeError('Construction moment of inertia overflow.');
  }

  return {
    totalMass: massReport.totalMass,
    centerOfMass: center,
    momentOfInertia,
    chunks: chunkReports
  };
}
