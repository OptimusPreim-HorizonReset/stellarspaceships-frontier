import { chunkKey, chunkPositionForTile } from '../core/coordinates';
import { isPowerPriority } from '../core/power';
import type { PowerPriority } from '../core/power';
import type { Construction } from '../construction/construction';
import { POWER_PRIORITY_ORDER } from './powerPriorities';

interface MutableChunkPowerBudget {
  readonly key: string;
  powerGeneration: number;
  higherPriorityConsumption: number;
}

export function calculateAvailablePowerByChunk(
  construction: Construction,
  priority: PowerPriority
): ReadonlyMap<string, number> {
  if (!isPowerPriority(priority)) {
    throw new TypeError(`Unknown power priority: ${String(priority)}.`);
  }

  const targetPriorityIndex = POWER_PRIORITY_ORDER.indexOf(priority);
  const chunks = new Map<string, MutableChunkPowerBudget>();

  for (const { position, tile } of construction.iterateTiles()) {
    if (!Number.isFinite(tile.hp) || tile.hp < 0) {
      throw new RangeError(`Invalid HP for tile ID ${tile.id}.`);
    }

    if (tile.hp === 0) {
      continue;
    }

    const definition = construction.tileRegistry.get(tile.type);

    if (definition === undefined) {
      throw new TypeError(`Tile type is not registered: ${tile.type}.`);
    }

    const chunkPosition = chunkPositionForTile(position);
    const key = chunkKey(chunkPosition);
    const chunk = chunks.get(key) ?? {
      key,
      powerGeneration: 0,
      higherPriorityConsumption: 0
    };
    const updatedGeneration =
      chunk.powerGeneration + definition.powerGeneration;

    if (!Number.isFinite(updatedGeneration)) {
      throw new RangeError(`Power generation overflow in chunk ${key}.`);
    }

    chunk.powerGeneration = updatedGeneration;

    if (definition.powerConsumption > 0) {
      const consumerPriority = definition.powerPriority;

      if (consumerPriority === undefined) {
        throw new TypeError(
          `Power consumer ${definition.type} has no priority.`
        );
      }

      const consumerPriorityIndex =
        POWER_PRIORITY_ORDER.indexOf(consumerPriority);

      if (consumerPriorityIndex < targetPriorityIndex) {
        const updatedConsumption =
          chunk.higherPriorityConsumption + definition.powerConsumption;

        if (!Number.isFinite(updatedConsumption)) {
          throw new RangeError(`Power consumption overflow in chunk ${key}.`);
        }

        chunk.higherPriorityConsumption = updatedConsumption;
      }
    }

    chunks.set(key, chunk);
  }

  return new Map(
    Array.from(chunks.values(), (chunk) => [
      chunk.key,
      Math.max(0, chunk.powerGeneration - chunk.higherPriorityConsumption)
    ])
  );
}
