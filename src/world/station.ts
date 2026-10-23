import type { Construction } from '../construction/construction';
import type { Vector2 } from '../physics/rigidBody';

export const STATION_TYPES = [
  'mining',
  'factory',
  'research',
  'defense'
] as const;

export type StationType = (typeof STATION_TYPES)[number];

const stationTypeSet = new Set<string>(STATION_TYPES);

export interface StationDefinition {
  readonly id: string;
  readonly type: StationType;
  readonly construction: Construction;
  readonly position: Vector2;
  readonly rotation: number;
  readonly ownerId: string | null;
}

export function isStationType(value: unknown): value is StationType {
  return typeof value === 'string' && stationTypeSet.has(value);
}

export class Station {
  readonly id: string;
  readonly type: StationType;
  readonly construction: Construction;
  readonly position: Vector2;
  readonly rotation: number;
  readonly ownerId: string | null;

  constructor(definition: StationDefinition) {
    if (definition.id.trim().length === 0) {
      throw new TypeError('Station ID must not be empty.');
    }

    if (!isStationType(definition.type)) {
      throw new TypeError(`Unknown station type: ${String(definition.type)}.`);
    }

    if (definition.construction.id !== definition.id) {
      throw new TypeError(
        'Station ID must match its construction ID.'
      );
    }

    if (definition.construction.tileCount === 0) {
      throw new RangeError('Station construction must contain at least one tile.');
    }

    if (
      !Number.isFinite(definition.position.x) ||
      !Number.isFinite(definition.position.y) ||
      !Number.isFinite(definition.rotation)
    ) {
      throw new RangeError('Station transform values must be finite.');
    }

    if (
      definition.ownerId !== null &&
      definition.ownerId.trim().length === 0
    ) {
      throw new TypeError('Station owner ID must not be empty.');
    }

    this.id = definition.id;
    this.type = definition.type;
    this.construction = definition.construction;
    this.position = Object.freeze({ ...definition.position });
    this.rotation = definition.rotation;
    this.ownerId = definition.ownerId;
  }
}
