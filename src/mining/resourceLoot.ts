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

  getContents(): ResourceCost {
    const contents: Partial<Record<ResourceType, number>> = {};

    for (const [resourceType, amount] of this.amounts) {
      contents[resourceType] = amount;
    }

    return Object.freeze(contents);
  }
}
