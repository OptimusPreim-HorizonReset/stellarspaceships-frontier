export const WORLD_SECTOR_COUNT = 4096;
export const MAX_SECTOR_SEED = 0xffff_ffff;

export interface SectorPosition {
  readonly x: number;
  readonly y: number;
}

export interface SectorObjectReference {
  readonly id: string;
  readonly type: string;
  readonly localPosition: SectorLocalPosition;
}

export interface SectorLocalPosition {
  readonly x: number;
  readonly y: number;
}

export interface SectorDefinition {
  readonly position: SectorPosition;
  readonly seed: number;
  readonly difficulty: number;
  readonly objects: readonly SectorObjectReference[];
  readonly ownerId?: string | null;
}

export interface Sector {
  readonly position: SectorPosition;
  readonly seed: number;
  readonly difficulty: number;
  readonly objects: readonly SectorObjectReference[];
  readonly ownerId: string | null;
}

export function assertValidSectorPosition(position: SectorPosition): void {
  if (
    !Number.isSafeInteger(position.x) ||
    !Number.isSafeInteger(position.y) ||
    position.x < 0 ||
    position.y < 0 ||
    position.x >= WORLD_SECTOR_COUNT ||
    position.y >= WORLD_SECTOR_COUNT
  ) {
    throw new RangeError(
      `Sector coordinates must be safe integers within 0..${WORLD_SECTOR_COUNT - 1}.`
    );
  }
}

function assertObjectReferences(
  objects: readonly SectorObjectReference[]
): readonly SectorObjectReference[] {
  if (!Array.isArray(objects)) {
    throw new TypeError('Sector objects must be an array.');
  }

  const ids = new Set<string>();
  const references = objects.map((object) => {
    if (
      typeof object.id !== 'string' ||
      object.id.trim().length === 0 ||
      typeof object.type !== 'string' ||
      object.type.trim().length === 0 ||
      !Number.isFinite(object.localPosition.x) ||
      !Number.isFinite(object.localPosition.y) ||
      object.localPosition.x < 0 ||
      object.localPosition.x >= 1 ||
      object.localPosition.y < 0 ||
      object.localPosition.y >= 1
    ) {
      throw new TypeError(
        'Sector object ID, type, and normalized local position must be valid.'
      );
    }

    if (ids.has(object.id)) {
      throw new TypeError(`Duplicate sector object ID: ${object.id}.`);
    }

    ids.add(object.id);
    return Object.freeze({
      id: object.id,
      type: object.type,
      localPosition: Object.freeze({ ...object.localPosition })
    });
  });

  return Object.freeze(references);
}

export function createSector(definition: SectorDefinition): Sector {
  assertValidSectorPosition(definition.position);

  if (
    !Number.isSafeInteger(definition.seed) ||
    definition.seed < 0 ||
    definition.seed > MAX_SECTOR_SEED
  ) {
    throw new RangeError('Sector seed must be an unsigned 32-bit integer.');
  }

  if (!Number.isFinite(definition.difficulty) || definition.difficulty < 0) {
    throw new RangeError('Sector difficulty must be finite and non-negative.');
  }

  const ownerId = definition.ownerId ?? null;

  if (ownerId !== null && ownerId.trim().length === 0) {
    throw new TypeError('Sector owner ID must not be empty.');
  }

  return Object.freeze({
    position: Object.freeze({ ...definition.position }),
    seed: definition.seed,
    difficulty: definition.difficulty,
    objects: assertObjectReferences(definition.objects),
    ownerId
  });
}
