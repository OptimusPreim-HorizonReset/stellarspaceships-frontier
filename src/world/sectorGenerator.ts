import {
  assertValidSectorPosition,
  createSector,
  WORLD_SECTOR_COUNT
} from './sector';
import type { Sector, SectorPosition } from './sector';

export interface SectorRingRule {
  readonly maximumDistance: number;
  readonly minimumAsteroids: number;
  readonly maximumAsteroids: number;
}

export interface SectorGenerationProfile {
  readonly rings: readonly SectorRingRule[];
}

function assertWorldSeed(worldSeed: number): void {
  if (
    !Number.isSafeInteger(worldSeed) ||
    worldSeed < 0 ||
    worldSeed > 0xffff_ffff
  ) {
    throw new RangeError('World seed must be an unsigned 32-bit integer.');
  }
}

function mixSeed(value: number): number {
  let mixed = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function nextRandom(seed: number): {
  readonly value: number;
  readonly nextSeed: number;
} {
  const nextSeed = (seed + 0x9e3779b9) >>> 0;
  return {
    value: mixSeed(nextSeed),
    nextSeed
  };
}

export function deriveSectorSeed(
  worldSeed: number,
  position: SectorPosition
): number {
  const xSeed = Math.imul(position.x + 1, 0x9e3779b1) >>> 0;
  const ySeed = Math.imul(position.y + 1, 0x85ebca6b) >>> 0;
  return mixSeed(mixSeed(worldSeed ^ xSeed) ^ ySeed);
}

function assertGenerationProfile(profile: SectorGenerationProfile): void {
  if (!Array.isArray(profile.rings) || profile.rings.length === 0) {
    throw new TypeError('Sector generation profile must define rings.');
  }

  let previousMaximumDistance = 0;

  for (const [index, ring] of profile.rings.entries()) {
    const countRange =
      ring.maximumAsteroids - ring.minimumAsteroids + 1;

    if (
      !Number.isFinite(ring.maximumDistance) ||
      ring.maximumDistance <= previousMaximumDistance ||
      !Number.isSafeInteger(ring.minimumAsteroids) ||
      !Number.isSafeInteger(ring.maximumAsteroids) ||
      ring.minimumAsteroids < 0 ||
      ring.maximumAsteroids < ring.minimumAsteroids ||
      !Number.isSafeInteger(countRange)
    ) {
      throw new RangeError(`Invalid sector generation rule at ring ${index}.`);
    }

    previousMaximumDistance = ring.maximumDistance;
  }
}

function ringForSector(
  position: SectorPosition,
  profile: SectorGenerationProfile
): SectorRingRule {
  const center = (WORLD_SECTOR_COUNT - 1) / 2;
  const distance = Math.hypot(position.x - center, position.y - center);
  const ring =
    profile.rings.find((candidate) => distance < candidate.maximumDistance) ??
    profile.rings[profile.rings.length - 1];

  if (ring === undefined) {
    throw new Error('Sector generation profile has no applicable ring.');
  }

  return ring;
}

export function generateSector(
  worldSeed: number,
  position: SectorPosition,
  profile: SectorGenerationProfile
): Sector {
  assertWorldSeed(worldSeed);
  assertValidSectorPosition(position);
  assertGenerationProfile(profile);

  const seed = deriveSectorSeed(worldSeed, position);
  const ring = ringForSector(position, profile);
  const countRandom = nextRandom(seed);
  const asteroidCount =
    ring.minimumAsteroids +
    (countRandom.value %
      (ring.maximumAsteroids - ring.minimumAsteroids + 1));
  let randomSeed = countRandom.nextSeed;
  const objects = [];

  for (let index = 0; index < asteroidCount; index += 1) {
    const xRandom = nextRandom(randomSeed);
    randomSeed = xRandom.nextSeed;
    const yRandom = nextRandom(randomSeed);
    randomSeed = yRandom.nextSeed;

    objects.push({
      id: `sector-${position.x}-${position.y}-asteroid-${index}`,
      type: 'asteroid',
      localPosition: {
        x: xRandom.value / 0x1_0000_0000,
        y: yRandom.value / 0x1_0000_0000
      }
    });
  }

  return createSector({
    position,
    seed,
    difficulty: 0,
    objects,
    ownerId: null
  });
}
