import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';
import { calculatePowerFlows } from './powerFlows';

export interface ChunkPowerGeneration {
  readonly position: ChunkPosition;
  readonly generatorCount: number;
  readonly powerGeneration: number;
}

export interface PowerGenerationReport {
  readonly generatorCount: number;
  readonly totalPowerGeneration: number;
  readonly chunks: readonly ChunkPowerGeneration[];
}

export function calculatePowerGeneration(
  construction: Construction
): PowerGenerationReport {
  const flows = calculatePowerFlows(construction);

  return {
    generatorCount: flows.generatorCount,
    totalPowerGeneration: flows.totalPowerGeneration,
    chunks: flows.chunks.map(
      ({ position, generatorCount, powerGeneration }) => ({
        position,
        generatorCount,
        powerGeneration
      })
    )
  };
}
