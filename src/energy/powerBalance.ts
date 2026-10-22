import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';
import { calculatePowerFlows } from './powerFlows';

export interface ChunkPowerBalance {
  readonly position: ChunkPosition;
  readonly powerGeneration: number;
  readonly powerConsumption: number;
  readonly netPower: number;
}

export interface PowerBalanceReport {
  readonly totalPowerGeneration: number;
  readonly totalPowerConsumption: number;
  readonly totalNetPower: number;
  readonly chunks: readonly ChunkPowerBalance[];
}

export function calculatePowerBalance(
  construction: Construction
): PowerBalanceReport {
  const flows = calculatePowerFlows(construction);
  const chunks = flows.chunks.map((chunk): ChunkPowerBalance => ({
    position: chunk.position,
    powerGeneration: chunk.powerGeneration,
    powerConsumption: chunk.powerConsumption,
    netPower: chunk.powerGeneration - chunk.powerConsumption
  }));
  const totalNetPower =
    flows.totalPowerGeneration - flows.totalPowerConsumption;

  if (!Number.isFinite(totalNetPower)) {
    throw new RangeError('Total net power overflow.');
  }

  return {
    totalPowerGeneration: flows.totalPowerGeneration,
    totalPowerConsumption: flows.totalPowerConsumption,
    totalNetPower,
    chunks
  };
}
