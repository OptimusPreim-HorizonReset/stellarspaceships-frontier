import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';
import { calculatePowerFlows } from './powerFlows';

export interface ChunkPowerConsumption {
  readonly position: ChunkPosition;
  readonly consumerCount: number;
  readonly powerConsumption: number;
}

export interface PowerConsumptionReport {
  readonly consumerCount: number;
  readonly totalPowerConsumption: number;
  readonly chunks: readonly ChunkPowerConsumption[];
}

export function calculatePowerConsumption(
  construction: Construction
): PowerConsumptionReport {
  const flows = calculatePowerFlows(construction);

  return {
    consumerCount: flows.consumerCount,
    totalPowerConsumption: flows.totalPowerConsumption,
    chunks: flows.chunks.map(
      ({ position, consumerCount, powerConsumption }) => ({
        position,
        consumerCount,
        powerConsumption
      })
    )
  };
}
