import type { LocalDamageResult } from '../combat/damage';
import { isResourceType } from '../core/tiles';
import type { ResourceCost, ResourceType } from '../core/tiles';
import type { Asteroid } from './asteroid';

export interface AsteroidResourceDrop {
  readonly id: string;
  readonly asteroidId: string;
  readonly sourceTileId: number;
  readonly resourceType: ResourceType;
  readonly amount: number;
}

export interface ResourceInventorySnapshot {
  readonly contents: ResourceCost;
  readonly collectedDropIds: readonly string[];
}

export type ResourceCollectionResult =
  | {
      readonly status: 'collected';
      readonly dropId: string;
      readonly resourceType: ResourceType;
      readonly amount: number;
      readonly totalAmount: number;
    }
  | {
      readonly status: 'already-collected';
      readonly dropId: string;
    };

export type ResourceTransferResult =
  | {
      readonly status: 'transferred';
      readonly resourceType: ResourceType;
      readonly amount: number;
      readonly sourceRemaining: number;
      readonly destinationTotal: number;
    }
  | {
      readonly status: 'insufficient-resources';
      readonly resourceType: ResourceType;
      readonly requestedAmount: number;
      readonly availableAmount: number;
    };

export function createAsteroidResourceDrop(
  asteroid: Asteroid,
  damageResult: LocalDamageResult
): AsteroidResourceDrop | undefined {
  if (damageResult.status !== 'destroyed') {
    return undefined;
  }

  if (damageResult.destroyedTile.type !== 'rock') {
    throw new TypeError('Only destroyed asteroid rock tiles can drop resources.');
  }

  if (damageResult.destroyedTile.hp !== 0) {
    throw new RangeError('Destroyed asteroid tile must have zero hit points.');
  }

  const deposit = asteroid.claimResourceDeposit(damageResult.destroyedTile.id);

  if (deposit === undefined) {
    return undefined;
  }

  return Object.freeze({
    id: `${asteroid.id}:tile:${damageResult.destroyedTile.id}`,
    asteroidId: asteroid.id,
    sourceTileId: damageResult.destroyedTile.id,
    resourceType: deposit.resourceType,
    amount: deposit.amount
  });
}

function assertValidDrop(drop: AsteroidResourceDrop): void {
  if (drop.id.trim().length === 0 || drop.asteroidId.trim().length === 0) {
    throw new TypeError('Resource drop IDs must not be empty.');
  }

  if (!Number.isSafeInteger(drop.sourceTileId) || drop.sourceTileId <= 0) {
    throw new RangeError('Resource drop tile ID must be a positive safe integer.');
  }

  if (!isResourceType(drop.resourceType)) {
    throw new TypeError(`Unknown resource type: ${String(drop.resourceType)}.`);
  }

  if (!Number.isFinite(drop.amount) || drop.amount <= 0) {
    throw new RangeError('Resource drop amount must be finite and positive.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAsteroidResourceDrop(value: unknown): AsteroidResourceDrop {
  if (!isRecord(value)) {
    throw new TypeError('Resource drop must be a JSON object.');
  }

  const { id, asteroidId, sourceTileId, resourceType, amount } = value;

  if (
    typeof id !== 'string' ||
    typeof asteroidId !== 'string' ||
    typeof sourceTileId !== 'number' ||
    typeof resourceType !== 'string' ||
    typeof amount !== 'number'
  ) {
    throw new TypeError('Resource drop fields have invalid types.');
  }

  if (!isResourceType(resourceType)) {
    throw new TypeError(`Unknown resource type: ${resourceType}.`);
  }

  const drop: AsteroidResourceDrop = {
    id,
    asteroidId,
    sourceTileId,
    resourceType,
    amount
  };
  assertValidDrop(drop);
  return Object.freeze(drop);
}

export class ResourceInventory {
  private readonly amounts = new Map<ResourceType, number>();
  private readonly collectedDropIds = new Set<string>();

  collect(drop: AsteroidResourceDrop): ResourceCollectionResult {
    assertValidDrop(drop);

    if (this.collectedDropIds.has(drop.id)) {
      return { status: 'already-collected', dropId: drop.id };
    }

    const totalAmount =
      (this.amounts.get(drop.resourceType) ?? 0) + drop.amount;

    if (!Number.isFinite(totalAmount)) {
      throw new RangeError(
        `Inventory amount overflow for resource ${drop.resourceType}.`
      );
    }

    this.amounts.set(drop.resourceType, totalAmount);
    this.collectedDropIds.add(drop.id);

    return {
      status: 'collected',
      dropId: drop.id,
      resourceType: drop.resourceType,
      amount: drop.amount,
      totalAmount
    };
  }

  getAmount(resourceType: ResourceType): number {
    if (!isResourceType(resourceType)) {
      throw new TypeError(`Unknown resource type: ${String(resourceType)}.`);
    }

    return this.amounts.get(resourceType) ?? 0;
  }

  transferTo(
    destination: ResourceInventory,
    resourceType: ResourceType,
    amount: number
  ): ResourceTransferResult {
    if (destination === this) {
      throw new TypeError('Resources cannot be transferred to the same inventory.');
    }

    if (!isResourceType(resourceType)) {
      throw new TypeError(`Unknown resource type: ${String(resourceType)}.`);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RangeError('Transfer amount must be finite and positive.');
    }

    const availableAmount = this.amounts.get(resourceType) ?? 0;

    if (amount > availableAmount) {
      return {
        status: 'insufficient-resources',
        resourceType,
        requestedAmount: amount,
        availableAmount
      };
    }

    const sourceRemaining = availableAmount - amount;
    const destinationTotal =
      (destination.amounts.get(resourceType) ?? 0) + amount;

    if (!Number.isFinite(destinationTotal)) {
      throw new RangeError(
        `Inventory amount overflow for resource ${resourceType}.`
      );
    }

    if (sourceRemaining === 0) {
      this.amounts.delete(resourceType);
    } else {
      this.amounts.set(resourceType, sourceRemaining);
    }

    destination.amounts.set(resourceType, destinationTotal);

    return {
      status: 'transferred',
      resourceType,
      amount,
      sourceRemaining,
      destinationTotal
    };
  }

  getContents(): ResourceCost {
    const contents: Partial<Record<ResourceType, number>> = {};

    for (const [resourceType, amount] of this.amounts) {
      contents[resourceType] = amount;
    }

    return Object.freeze(contents);
  }

  getSnapshot(): ResourceInventorySnapshot {
    return Object.freeze({
      contents: this.getContents(),
      collectedDropIds: Object.freeze(
        Array.from(this.collectedDropIds).sort()
      )
    });
  }

  static fromSnapshot(value: unknown): ResourceInventory {
    if (!isRecord(value) || !isRecord(value.contents)) {
      throw new TypeError('Resource inventory snapshot is invalid.');
    }

    if (!Array.isArray(value.collectedDropIds)) {
      throw new TypeError('Collected resource drop IDs must be an array.');
    }

    const amounts = new Map<ResourceType, number>();

    for (const [resourceType, amount] of Object.entries(value.contents)) {
      if (!isResourceType(resourceType)) {
        throw new TypeError(`Unknown resource type: ${resourceType}.`);
      }

      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        throw new RangeError(`Invalid inventory amount for ${resourceType}.`);
      }

      amounts.set(resourceType, amount);
    }

    const collectedDropIds = new Set<string>();

    for (const dropId of value.collectedDropIds) {
      if (typeof dropId !== 'string' || dropId.trim().length === 0) {
        throw new TypeError('Collected resource drop IDs must not be empty.');
      }

      if (collectedDropIds.has(dropId)) {
        throw new TypeError(`Duplicate collected resource drop ID: ${dropId}.`);
      }

      collectedDropIds.add(dropId);
    }

    const inventory = new ResourceInventory();

    for (const [resourceType, amount] of amounts) {
      inventory.amounts.set(resourceType, amount);
    }

    for (const dropId of collectedDropIds) {
      inventory.collectedDropIds.add(dropId);
    }

    return inventory;
  }
}
