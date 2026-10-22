import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';
import { calculateCenterOfMass } from '../src/physics/centerOfMass';

describe('center of mass', () => {
  it('weights live tile centers by their registry mass', () => {
    const construction = new Construction('weighted-ship');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    construction.placeTile({ x: 1, y: 0 }, 'armor');
    const destroyedReactor = construction.placeTile(
      { x: 2, y: 0 },
      'reactor'
    );
    destroyedReactor.hp = 0;

    const report = calculateCenterOfMass(construction);

    expect(report.totalMass).toBe(30);
    expect(report.centerOfMass?.x).toBeCloseTo(35 / 30);
    expect(report.centerOfMass?.y).toBeCloseTo(0.5);
    expect(report.chunks).toHaveLength(1);
    expect(report.chunks[0]?.centerOfMass.x).toBeCloseTo(35 / 30);
  });

  it('returns no center for an empty or zero-mass construction', () => {
    const construction = new Construction('zero-mass');

    expect(calculateCenterOfMass(construction)).toEqual({
      totalMass: 0,
      centerOfMass: null,
      chunks: []
    });
  });
});
