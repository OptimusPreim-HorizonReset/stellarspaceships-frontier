import { describe, expect, it } from 'vitest';
import { createSector } from '../src/world/sector';
import { simulateBackgroundSectors } from '../src/world/backgroundSimulation';
import type { Sector } from '../src/world/sector';

function createTestSector(x: number, y: number, difficulty = 0): Sector {
  return createSector({
    position: { x, y },
    seed: x + y + 1,
    difficulty,
    objects: [],
    ownerId: null
  });
}

describe('sector background simulation', () => {
  it('splits elapsed time into deterministic bounded steps without mutating input', () => {
    const sector = createTestSector(3, 2);
    const update = simulateBackgroundSectors(
      [sector],
      1,
      0.25,
      (currentSector, deltaTimeSeconds) =>
        createSector({
          ...currentSector,
          difficulty: currentSector.difficulty + deltaTimeSeconds
        })
    )[0];

    expect(update?.stepsPerformed).toBe(4);
    expect(update?.elapsedSeconds).toBe(1);
    expect(update?.sector.difficulty).toBeCloseTo(1);
    expect(sector.difficulty).toBe(0);
  });

  it('orders sectors by coordinates and preserves identity and seed', () => {
    const sectors = [createTestSector(1, 0), createTestSector(0, 0)];
    const updates = simulateBackgroundSectors(
      sectors,
      0.5,
      0.5,
      (sector) => sector
    );

    expect(updates.map(({ sector }) => sector.position)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]);
    expect(updates.map(({ stepsPerformed }) => stepsPerformed)).toEqual([1, 1]);
  });

  it('rejects invalid steps, duplicate sectors, and identity changes', () => {
    const sector = createTestSector(0, 0);

    expect(() =>
      simulateBackgroundSectors([sector], -1, 0.5, (current) => current)
    ).toThrow('Background elapsed time must be finite and non-negative.');
    expect(() =>
      simulateBackgroundSectors([sector], 1, 0, (current) => current)
    ).toThrow('Background max step must be finite and positive.');
    expect(() =>
      simulateBackgroundSectors(
        [sector, sector],
        1,
        1,
        (current) => current
      )
    ).toThrow('Duplicate background sector: 0,0.');
    expect(() =>
      simulateBackgroundSectors([sector], 1, 1, (current) =>
        createSector({
          ...current,
          seed: current.seed + 1
        })
      )
    ).toThrow(
      'Background simulation must preserve sector position and seed for 0,0.'
    );
  });
});
