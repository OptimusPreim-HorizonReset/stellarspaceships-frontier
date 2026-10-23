import { CHUNK_SIZE } from '../core/config';
import { chunkKey } from '../core/coordinates';
import type { ChunkPosition } from '../core/coordinates';
import type { Projectile } from './projectiles';

export interface AxisAlignedBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface BroadphaseTarget {
  readonly id: string;
  readonly ownerId: string;
  readonly bounds: AxisAlignedBounds;
}

export interface ProjectileCollisionCandidate {
  readonly projectile: Projectile;
  readonly target: BroadphaseTarget;
}

interface CellRange {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function assertBounds(bounds: AxisAlignedBounds, label: string): void {
  const values = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];

  if (!values.every(Number.isFinite)) {
    throw new RangeError(`${label} must contain finite coordinates.`);
  }

  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    throw new RangeError(`${label} minimums must not exceed maximums.`);
  }
}

function cellRangeForBounds(bounds: AxisAlignedBounds): CellRange {
  const range = {
    minX: Math.floor(bounds.minX / CHUNK_SIZE),
    minY: Math.floor(bounds.minY / CHUNK_SIZE),
    maxX: Math.floor(bounds.maxX / CHUNK_SIZE),
    maxY: Math.floor(bounds.maxY / CHUNK_SIZE)
  };
  const coordinates = [range.minX, range.minY, range.maxX, range.maxY];

  if (!coordinates.every(Number.isSafeInteger)) {
    throw new RangeError('Collision bounds exceed safe chunk coordinates.');
  }

  return range;
}

function forEachCell(
  range: CellRange,
  visit: (position: ChunkPosition, key: string) => void
): void {
  for (let y = range.minY; y <= range.maxY; y += 1) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      const position = { x, y };
      visit(position, chunkKey(position));
    }
  }
}

function projectileBounds(projectile: Projectile): AxisAlignedBounds {
  if (!Number.isSafeInteger(projectile.id) || projectile.id <= 0) {
    throw new RangeError('Projectile ID must be a positive safe integer.');
  }

  if (projectile.ownerId.trim().length === 0) {
    throw new TypeError('Projectile owner ID must not be empty.');
  }

  if (
    !Number.isFinite(projectile.collisionRadius) ||
    projectile.collisionRadius < 0
  ) {
    throw new RangeError('Projectile collision radius must be finite and non-negative.');
  }

  const positions = [
    projectile.previousPosition.x,
    projectile.previousPosition.y,
    projectile.position.x,
    projectile.position.y
  ];

  if (!positions.every(Number.isFinite)) {
    throw new RangeError('Projectile positions must be finite.');
  }

  const radius = projectile.collisionRadius;
  const bounds = {
    minX:
      Math.min(projectile.previousPosition.x, projectile.position.x) - radius,
    minY:
      Math.min(projectile.previousPosition.y, projectile.position.y) - radius,
    maxX:
      Math.max(projectile.previousPosition.x, projectile.position.x) + radius,
    maxY:
      Math.max(projectile.previousPosition.y, projectile.position.y) + radius
  };

  assertBounds(bounds, 'Swept projectile bounds');
  return bounds;
}

function boundsOverlap(
  left: AxisAlignedBounds,
  right: AxisAlignedBounds
): boolean {
  return (
    left.minX <= right.maxX &&
    left.maxX >= right.minX &&
    left.minY <= right.maxY &&
    left.maxY >= right.minY
  );
}

function compareIds(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

export function findProjectileCollisionCandidates(
  projectiles: readonly Projectile[],
  targets: readonly BroadphaseTarget[]
): ProjectileCollisionCandidate[] {
  const targetsByCell = new Map<string, BroadphaseTarget[]>();
  const targetIds = new Set<string>();

  for (const target of targets) {
    if (target.id.trim().length === 0 || target.ownerId.trim().length === 0) {
      throw new TypeError('Collision target IDs must not be empty.');
    }

    if (targetIds.has(target.id)) {
      throw new TypeError(`Duplicate collision target ID: ${target.id}.`);
    }

    targetIds.add(target.id);
    assertBounds(target.bounds, `Collision target ${target.id} bounds`);

    forEachCell(cellRangeForBounds(target.bounds), (_position, key) => {
      const cellTargets = targetsByCell.get(key);

      if (cellTargets === undefined) {
        targetsByCell.set(key, [target]);
      } else {
        cellTargets.push(target);
      }
    });
  }

  const projectileIds = new Set<number>();
  const candidates: ProjectileCollisionCandidate[] = [];

  for (const projectile of projectiles) {
    if (projectileIds.has(projectile.id)) {
      throw new TypeError(`Duplicate projectile ID: ${projectile.id}.`);
    }

    projectileIds.add(projectile.id);
    const sweptBounds = projectileBounds(projectile);
    const nearbyTargetIds = new Set<string>();

    forEachCell(cellRangeForBounds(sweptBounds), (_position, key) => {
      for (const target of targetsByCell.get(key) ?? []) {
        if (
          target.ownerId === projectile.ownerId ||
          nearbyTargetIds.has(target.id)
        ) {
          continue;
        }

        nearbyTargetIds.add(target.id);

        if (boundsOverlap(sweptBounds, target.bounds)) {
          candidates.push({ projectile, target });
        }
      }
    });
  }

  candidates.sort(
    (left, right) =>
      left.projectile.id - right.projectile.id ||
      compareIds(left.target.id, right.target.id)
  );

  return candidates;
}
