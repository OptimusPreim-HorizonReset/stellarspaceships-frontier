import { describe, expect, it } from 'vitest';
import {
  GATE_D_PROFILE,
  GateDStreamingWorkload
} from '../src/benchmark/gateDProfile';

describe('Gate D streaming workload', () => {
  it('moves between sectors while keeping the loaded 3x3 cache bounded', () => {
    const workload = new GateDStreamingWorkload();

    expect(workload.metrics.finalLoadedSectors).toBe(
      GATE_D_PROFILE.maximumLoadedSectors
    );

    for (let index = 0; index < 300; index += 1) {
      const step = workload.advance();

      expect(step.activeSectorCount).toBe(
        GATE_D_PROFILE.sectorsPerNeighborhood
      );
      expect(step.newlyGeneratedSectorCount).toBe(3);
      expect(step.unloadedSectorCount).toBe(3);
      expect(step.loadedSectorCount).toBe(
        GATE_D_PROFILE.maximumLoadedSectors
      );
    }

    expect(workload.metrics).toMatchObject({
      sectorTransitions: 300,
      totalSectorsGenerated: 909,
      totalSectorsUnloaded: 900,
      maxLoadedSectors: GATE_D_PROFILE.maximumLoadedSectors,
      finalLoadedSectors: GATE_D_PROFILE.maximumLoadedSectors,
      maxActiveSectors: GATE_D_PROFILE.sectorsPerNeighborhood,
      finalActiveSectors: GATE_D_PROFILE.sectorsPerNeighborhood,
      cacheBoundMaintained: true
    });
  });
});
