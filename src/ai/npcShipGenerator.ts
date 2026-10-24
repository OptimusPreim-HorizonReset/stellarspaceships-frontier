import { Construction } from '../construction/construction';
import type { TileOrientation, TileType } from '../core/tiles';

export const NPC_SHIP_DOCTRINES = [
  'aggressive',
  'defensive',
  'trader',
  'scout'
] as const;

export type NpcShipDoctrine = (typeof NPC_SHIP_DOCTRINES)[number];

export const MAX_NPC_SHIP_TILES = 10_000;
export const MAX_NPC_TECHNOLOGY_LEVEL = 10;

export interface NpcShipGenerationInput {
  readonly id: string;
  readonly seed: number;
  readonly tileBudget: number;
  readonly technologyLevel: number;
  readonly doctrine: NpcShipDoctrine;
}

export interface GeneratedNpcShip {
  readonly id: string;
  readonly seed: number;
  readonly tileBudget: number;
  readonly technologyLevel: number;
  readonly doctrine: NpcShipDoctrine;
  readonly construction: Construction;
  readonly tileCounts: Readonly<Partial<Record<TileType, number>>>;
}

type TileWeights = Readonly<Record<TileType, number>>;

const doctrineSet = new Set<string>(NPC_SHIP_DOCTRINES);
const candidateTileTypes: readonly TileType[] = [
  'hull',
  'armor',
  'reactor',
  'battery',
  'thruster',
  'storage'
];

const doctrineWeights: Readonly<Record<NpcShipDoctrine, TileWeights>> =
  Object.freeze({
    aggressive: Object.freeze({
      hull: 2,
      armor: 1,
      reactor: 3,
      battery: 1,
      thruster: 5,
      storage: 1,
      rock: 0
    }),
    defensive: Object.freeze({
      hull: 2,
      armor: 5,
      reactor: 3,
      battery: 3,
      thruster: 1,
      storage: 1,
      rock: 0
    }),
    trader: Object.freeze({
      hull: 3,
      armor: 1,
      reactor: 2,
      battery: 1,
      thruster: 2,
      storage: 5,
      rock: 0
    }),
    scout: Object.freeze({
      hull: 2,
      armor: 1,
      reactor: 2,
      battery: 3,
      thruster: 5,
      storage: 1,
      rock: 0
    })
  });

export function isNpcShipDoctrine(value: unknown): value is NpcShipDoctrine {
  return typeof value === 'string' && doctrineSet.has(value);
}

function mixSeed(value: number): number {
  let mixed = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function doctrineSignature(
  doctrine: NpcShipDoctrine,
  technologyLevel: number
): TileType {
  switch (doctrine) {
    case 'aggressive':
      return 'thruster';
    case 'defensive':
      return technologyLevel >= 2
        ? 'armor'
        : technologyLevel >= 1
          ? 'battery'
          : 'hull';
    case 'trader':
      return 'storage';
    case 'scout':
      return technologyLevel >= 1 ? 'battery' : 'thruster';
  }
}

function selectWeightedTileType(
  seed: number,
  tileIndex: number,
  technologyLevel: number,
  doctrine: NpcShipDoctrine
): TileType {
  const weights = doctrineWeights[doctrine];
  const candidates = candidateTileTypes
    .map((type) => {
      if (
        (type === 'battery' && technologyLevel < 1) ||
        (type === 'armor' && technologyLevel < 2)
      ) {
        return { type, weight: 0 };
      }

      const technologyBonus =
        type === 'armor'
          ? Math.floor(technologyLevel / 2)
          : type === 'battery'
            ? Math.floor(technologyLevel / 3)
            : 0;

      return { type, weight: weights[type] + technologyBonus };
    })
    .filter(({ weight }) => weight > 0);
  const totalWeight = candidates.reduce(
    (total, candidate) => total + candidate.weight,
    0
  );

  if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
    throw new Error(`NPC doctrine has no valid tile weights: ${doctrine}.`);
  }

  let roll = mixSeed(seed ^ Math.imul(tileIndex + 1, 0x9e3779b1)) % totalWeight;

  for (const candidate of candidates) {
    if (roll < candidate.weight) {
      return candidate.type;
    }

    roll -= candidate.weight;
  }

  throw new Error(`NPC tile selection failed at index ${tileIndex}.`);
}

function selectTileType(
  tileIndex: number,
  technologyLevel: number,
  doctrine: NpcShipDoctrine,
  tileCounts: Readonly<Partial<Record<TileType, number>>>,
  seed: number
): TileType {
  if (tileIndex === 0) {
    return 'hull';
  }

  if (tileIndex === 1) {
    return 'reactor';
  }

  if (tileIndex === 2) {
    return 'thruster';
  }

  if (tileIndex === 3) {
    return doctrineSignature(doctrine, technologyLevel);
  }

  if (technologyLevel >= 1 && (tileCounts.battery ?? 0) === 0) {
    return 'battery';
  }

  if (technologyLevel >= 2 && (tileCounts.armor ?? 0) === 0) {
    return 'armor';
  }

  return selectWeightedTileType(seed, tileIndex, technologyLevel, doctrine);
}

function positionForTileIndex(
  tileIndex: number,
  tileBudget: number
): { readonly x: number; readonly y: number } {
  const width = Math.ceil(Math.sqrt(tileBudget));
  const row = Math.floor(tileIndex / width);
  const offset = tileIndex % width;

  return {
    x: row % 2 === 0 ? offset : width - 1 - offset,
    y: row
  };
}

export function generateNpcShip(
  input: NpcShipGenerationInput
): GeneratedNpcShip {
  if (typeof input.id !== 'string' || input.id.trim().length === 0) {
    throw new TypeError('NPC ship ID must not be empty.');
  }

  if (
    !Number.isSafeInteger(input.seed) ||
    input.seed < 0 ||
    input.seed > 0xffff_ffff
  ) {
    throw new RangeError('NPC ship seed must be an unsigned 32-bit integer.');
  }

  if (
    !Number.isSafeInteger(input.tileBudget) ||
    input.tileBudget <= 0 ||
    input.tileBudget > MAX_NPC_SHIP_TILES
  ) {
    throw new RangeError(
      `NPC tile budget must be a positive integer up to ${MAX_NPC_SHIP_TILES}.`
    );
  }

  if (
    !Number.isSafeInteger(input.technologyLevel) ||
    input.technologyLevel < 0 ||
    input.technologyLevel > MAX_NPC_TECHNOLOGY_LEVEL
  ) {
    throw new RangeError(
      `NPC technology level must be an integer within 0..${MAX_NPC_TECHNOLOGY_LEVEL}.`
    );
  }

  if (!isNpcShipDoctrine(input.doctrine)) {
    throw new TypeError(`Unknown NPC ship doctrine: ${String(input.doctrine)}.`);
  }

  const construction = new Construction(input.id);
  const tileCounts: Partial<Record<TileType, number>> = {};

  for (let tileIndex = 0; tileIndex < input.tileBudget; tileIndex += 1) {
    const type = selectTileType(
      tileIndex,
      input.technologyLevel,
      input.doctrine,
      tileCounts,
      input.seed
    );
    const orientation: TileOrientation =
      type === 'thruster' ? 'west' : 'north';

    construction.placeTile(
      positionForTileIndex(tileIndex, input.tileBudget),
      type,
      orientation
    );
    tileCounts[type] = (tileCounts[type] ?? 0) + 1;
  }

  if (construction.tileCount !== input.tileBudget) {
    throw new Error('NPC ship generator did not honor the requested tile budget.');
  }

  return Object.freeze({
    id: input.id,
    seed: input.seed,
    tileBudget: input.tileBudget,
    technologyLevel: input.technologyLevel,
    doctrine: input.doctrine,
    construction,
    tileCounts: Object.freeze({ ...tileCounts })
  });
}
