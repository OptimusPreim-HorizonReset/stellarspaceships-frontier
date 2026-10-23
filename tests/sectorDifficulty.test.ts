import { describe, expect, it } from 'vitest';
import { createSector } from '../src/world/sector';
import {
  applyDistanceDifficulty,
  calculateSectorDifficulty
} from '../src/world/sectorDifficulty';

describe('sector distance difficulty', () => {
  it('scales distance from the center using the provided modifier', () => {
    expect(
      calculateSectorDifficulty({ x: 2048, y: 2048 }, 2)
    ).toBeCloseTo(Math.SQRT2);
    expect(
      calculateSectorDifficulty({ x: 0, y: 0 }, 0.01)
    ).toBeCloseTo(Math.hypot(2047.5, 2047.5) * 0.01);
    expect(
      calculateSectorDifficulty({ x: 0, y: 0 }, 0)
    ).toBe(0);
  });

  it('preserves sector data when applying distance difficulty', () => {
    const sector = createSector({
      position: { x: 2048, y: 2048 },
      seed: 123,
      difficulty: 99,
      objects: [
        {
          id: 'asteroid-1',
          type: 'asteroid',
          localPosition: { x: 0.25, y: 0.75 }
        }
      ],
      ownerId: 'faction-1'
    });

    const updated = applyDistanceDifficulty(sector, 2);

    expect(updated).toMatchObject({
      position: sector.position,
      seed: sector.seed,
      objects: sector.objects,
      ownerId: sector.ownerId,
      difficulty: Math.SQRT2
    });
    expect(updated).not.toBe(sector);
  });

  it('rejects invalid modifiers', () => {
    expect(() =>
      calculateSectorDifficulty({ x: 0, y: 0 }, -1)
    ).toThrow('Difficulty modifier must be finite and non-negative.');
    expect(() =>
      calculateSectorDifficulty({ x: 0, y: 0 }, Number.NaN)
    ).toThrow('Difficulty modifier must be finite and non-negative.');
  });
});
