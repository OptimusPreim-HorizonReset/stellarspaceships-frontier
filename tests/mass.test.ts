import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';
import { calculateConstructionMass } from '../src/physics/mass';

describe('construction mass', () => {
  it('aggregates live tile mass by chunk and construction', () => {
    const construction = new Construction('massive-ship');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    construction.placeTile({ x: 31, y: 0 }, 'armor');
    construction.placeTile({ x: 32, y: 0 }, 'reactor');
    const destroyedBattery = construction.placeTile(
      { x: 33, y: 0 },
      'battery'
    );
    destroyedBattery.hp = 0;

    expect(calculateConstructionMass(construction)).toEqual({
      tileCount: 3,
      totalMass: 130,
      chunks: [
        {
          position: { x: 0, y: 0 },
          tileCount: 2,
          totalMass: 30
        },
        {
          position: { x: 1, y: 0 },
          tileCount: 1,
          totalMass: 100
        }
      ]
    });
  });

  it('returns an empty report for an empty construction', () => {
    expect(calculateConstructionMass(new Construction('empty-ship'))).toEqual({
      tileCount: 0,
      totalMass: 0,
      chunks: []
    });
  });
});
