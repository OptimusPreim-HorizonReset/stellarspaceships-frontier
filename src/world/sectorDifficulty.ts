import {
  assertValidSectorPosition,
  createSector,
  WORLD_SECTOR_COUNT
} from './sector';
import type { Sector, SectorPosition } from './sector';

export function calculateSectorDifficulty(
  position: SectorPosition,
  modifier: number
): number {
  assertValidSectorPosition(position);

  if (!Number.isFinite(modifier) || modifier < 0) {
    throw new RangeError('Difficulty modifier must be finite and non-negative.');
  }

  const center = (WORLD_SECTOR_COUNT - 1) / 2;
  const distance = Math.hypot(position.x - center, position.y - center);
  const difficulty = distance * modifier;

  if (!Number.isFinite(difficulty)) {
    throw new RangeError('Sector difficulty calculation overflow.');
  }

  return difficulty;
}

export function applyDistanceDifficulty(
  sector: Sector,
  modifier: number
): Sector {
  return createSector({
    position: sector.position,
    seed: sector.seed,
    difficulty: calculateSectorDifficulty(sector.position, modifier),
    objects: sector.objects,
    ownerId: sector.ownerId
  });
}
