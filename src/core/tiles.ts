import { isPowerPriority } from './power';
import type { PowerPriority } from './power';

export const TILE_TYPES = [
  'hull',
  'armor',
  'reactor',
  'battery',
  'thruster',
  'storage',
  'rock'
] as const;

export type TileType = (typeof TILE_TYPES)[number];

export const TILE_ORIENTATIONS = [
  'north',
  'east',
  'south',
  'west'
] as const;

export type TileOrientation = (typeof TILE_ORIENTATIONS)[number];

export const RESOURCE_TYPES = [
  'ore',
  'ice',
  'gas',
  'scrap',
  'crystal',
  'steel',
  'electronics',
  'fuel',
  'weapons',
  'components',
  'antimatter',
  'darkMatter',
  'ancientTechnology'
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type ResourceCost = Readonly<Partial<Record<ResourceType, number>>>;

const resourceTypeSet = new Set<string>(RESOURCE_TYPES);

export function isResourceType(value: unknown): value is ResourceType {
  return typeof value === 'string' && resourceTypeSet.has(value);
}

export interface TileDefinition {
  readonly type: TileType;
  readonly maxHp: number;
  readonly armor: number;
  readonly mass: number;
  readonly powerGeneration: number;
  readonly powerConsumption: number;
  readonly powerPriority?: PowerPriority;
  readonly thrustForce: number;
  readonly storageCapacity: number;
  readonly buildCost: ResourceCost;
}

export interface Tile {
  readonly id: number;
  readonly type: TileType;
  readonly orientation: TileOrientation;
  hp: number;
  readonly armor: number;
  readonly mass: number;
}

export type TileRegistry = ReadonlyMap<TileType, TileDefinition>;

const tileTypeSet = new Set<string>(TILE_TYPES);
const tileOrientationSet = new Set<string>(TILE_ORIENTATIONS);

export function isTileType(value: unknown): value is TileType {
  return typeof value === 'string' && tileTypeSet.has(value);
}

export function isTileOrientation(value: unknown): value is TileOrientation {
  return typeof value === 'string' && tileOrientationSet.has(value);
}

export function createTileRegistry(
  definitions: readonly TileDefinition[]
): TileRegistry {
  const registry = new Map<TileType, TileDefinition>();

  for (const definition of definitions) {
    if (!isTileType(definition.type)) {
      throw new TypeError(`Unknown tile type: ${String(definition.type)}.`);
    }

    if (registry.has(definition.type)) {
      throw new TypeError(`Duplicate tile definition: ${definition.type}.`);
    }

    const numericValues = [
      definition.maxHp,
      definition.armor,
      definition.mass,
      definition.powerGeneration,
      definition.powerConsumption,
      definition.thrustForce,
      definition.storageCapacity
    ];

    if (
      !numericValues.every(Number.isFinite) ||
      definition.maxHp <= 0 ||
      numericValues.slice(1).some((value) => value < 0)
    ) {
      throw new RangeError(`Invalid numeric values for ${definition.type}.`);
    }

    if (
      definition.powerPriority !== undefined &&
      !isPowerPriority(definition.powerPriority)
    ) {
      throw new TypeError(
        `Invalid power priority for ${definition.type}.`
      );
    }

    if (
      definition.powerConsumption > 0 &&
      definition.powerPriority === undefined
    ) {
      throw new TypeError(
        `Power consumer ${definition.type} must declare a priority.`
      );
    }

    for (const [resource, amount] of Object.entries(definition.buildCost)) {
      if (
        !RESOURCE_TYPES.some((type) => type === resource) ||
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        throw new RangeError(
          `Invalid build cost for ${definition.type}: ${resource}.`
        );
      }
    }

    const frozenDefinition = Object.freeze({
      ...definition,
      buildCost: Object.freeze({ ...definition.buildCost })
    });

    registry.set(definition.type, frozenDefinition);
  }

  return registry;
}

export const DEFAULT_TILE_REGISTRY = createTileRegistry([
  {
    type: 'hull',
    maxHp: 100,
    armor: 0,
    mass: 10,
    powerGeneration: 0,
    powerConsumption: 0,
    thrustForce: 0,
    storageCapacity: 0,
    buildCost: { ore: 1 }
  },
  {
    type: 'armor',
    maxHp: 150,
    armor: 50,
    mass: 20,
    powerGeneration: 0,
    powerConsumption: 0,
    thrustForce: 0,
    storageCapacity: 0,
    buildCost: { ore: 3 }
  },
  {
    type: 'reactor',
    maxHp: 120,
    armor: 5,
    mass: 100,
    powerGeneration: 1000,
    powerConsumption: 0,
    thrustForce: 0,
    storageCapacity: 0,
    buildCost: { ore: 10, electronics: 2 }
  },
  {
    type: 'battery',
    maxHp: 100,
    armor: 2,
    mass: 50,
    powerGeneration: 0,
    powerConsumption: 0,
    thrustForce: 0,
    storageCapacity: 500,
    buildCost: { ore: 5, electronics: 1 }
  },
  {
    type: 'thruster',
    maxHp: 80,
    armor: 2,
    mass: 40,
    powerGeneration: 0,
    powerConsumption: 25,
    powerPriority: 'propulsion',
    thrustForce: 100,
    storageCapacity: 0,
    buildCost: { ore: 4, electronics: 1 }
  },
  {
    type: 'storage',
    maxHp: 80,
    armor: 1,
    mass: 80,
    powerGeneration: 0,
    powerConsumption: 0,
    thrustForce: 0,
    storageCapacity: 1000,
    buildCost: { ore: 2 }
  },
  {
    type: 'rock',
    maxHp: 100,
    armor: 0,
    mass: 10,
    powerGeneration: 0,
    powerConsumption: 0,
    thrustForce: 0,
    storageCapacity: 0,
    buildCost: {}
  }
]);
