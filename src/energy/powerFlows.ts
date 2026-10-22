import {
  chunkKey,
  chunkPositionForTile
} from '../core/coordinates';
import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';

export interface ChunkPowerFlow {
  readonly position: ChunkPosition;
  readonly generatorCount: number;
  readonly powerGeneration: number;
  readonly consumerCount: number;
  readonly powerConsumption: number;
}

export interface PowerFlowReport {
  readonly generatorCount: number;
  readonly totalPowerGeneration: number;
  readonly consumerCount: number;
  readonly totalPowerConsumption: number;
  readonly chunks: readonly ChunkPowerFlow[];
}

interface MutableChunkPowerFlow {
  readonly position: ChunkPosition;
  generatorCount: number;
  powerGeneration: number;
  consumerCount: number;
  powerConsumption: number;
}

export function calculatePowerFlows(
  construction: Construction
): PowerFlowReport {
  const chunks = new Map<string, MutableChunkPowerFlow>();

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

    const powerGeneration = definition.powerGeneration;
    const powerConsumption = definition.powerConsumption;

    if (powerGeneration === 0 && powerConsumption === 0) {
      continue;
    }

    const chunkPosition = chunkPositionForTile(position);
    const key = chunkKey(chunkPosition);
    const current = chunks.get(key) ?? {
      position: chunkPosition,
      generatorCount: 0,
      powerGeneration: 0,
      consumerCount: 0,
      powerConsumption: 0
    };
    const updatedGeneration = current.powerGeneration + powerGeneration;
    const updatedConsumption = current.powerConsumption + powerConsumption;

    if (
      !Number.isFinite(updatedGeneration) ||
      !Number.isFinite(updatedConsumption)
    ) {
      throw new RangeError(`Power flow overflow in chunk ${key}.`);
    }

    if (powerGeneration > 0) {
      current.generatorCount += 1;
    }

    if (powerConsumption > 0) {
      current.consumerCount += 1;
    }

    current.powerGeneration = updatedGeneration;
    current.powerConsumption = updatedConsumption;
    chunks.set(key, current);
  }

  const chunkReports = Array.from(chunks.values()).sort(
    (left, right) =>
      left.position.y - right.position.y ||
      left.position.x - right.position.x
  );
  const totalPowerGeneration = chunkReports.reduce(
    (total, chunk) => total + chunk.powerGeneration,
    0
  );
  const totalPowerConsumption = chunkReports.reduce(
    (total, chunk) => total + chunk.powerConsumption,
    0
  );

  if (
    !Number.isFinite(totalPowerGeneration) ||
    !Number.isFinite(totalPowerConsumption)
  ) {
    throw new RangeError('Total power flow overflow.');
  }

  return {
    generatorCount: chunkReports.reduce(
      (total, chunk) => total + chunk.generatorCount,
      0
    ),
    totalPowerGeneration,
    consumerCount: chunkReports.reduce(
      (total, chunk) => total + chunk.consumerCount,
      0
    ),
    totalPowerConsumption,
    chunks: chunkReports
  };
}
