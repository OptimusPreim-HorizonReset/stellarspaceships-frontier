import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';
import { calculateMomentOfInertia } from '../src/physics/momentOfInertia';

describe('moment of inertia', () => {
  it('includes uniform square-tile inertia and the parallel-axis contribution', () => {
    const construction = new Construction('rotating-ship');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    construction.placeTile({ x: 1, y: 0 }, 'armor');

    const report = calculateMomentOfInertia(construction);

    expect(report.totalMass).toBe(30);
    expect(report.centerOfMass?.x).toBeCloseTo(35 / 30);
    expect(report.centerOfMass?.y).toBeCloseTo(0.5);
    expect(report.momentOfInertia).toBeCloseTo(35 / 3);
    expect(report.chunks).toHaveLength(1);
    expect(report.chunks[0]?.momentOfInertia).toBeCloseTo(35 / 3);
  });

  it('returns zero inertia when there is no live mass', () => {
    const construction = new Construction('empty-ship');

    expect(calculateMomentOfInertia(construction)).toEqual({
      totalMass: 0,
      centerOfMass: null,
      momentOfInertia: 0,
      chunks: []
    });
  });

  it('ignores destroyed tiles', () => {
    const construction = new Construction('damaged-ship');
    const hull = construction.placeTile({ x: 0, y: 0 }, 'hull');
    const reactor = construction.placeTile({ x: 8, y: 0 }, 'reactor');
    reactor.hp = 0;

    const report = calculateMomentOfInertia(construction);

    expect(report.totalMass).toBe(10);
    expect(report.centerOfMass).toEqual({ x: 0.5, y: 0.5 });
    expect(report.momentOfInertia).toBeCloseTo(10 / 6);
    expect(report.chunks).toHaveLength(1);
    expect(report.chunks[0]?.position).toEqual({ x: 0, y: 0 });
    expect(report.chunks[0]?.momentOfInertia).toBeCloseTo(10 / 6);
    expect(hull.mass).toBe(10);
  });
});
