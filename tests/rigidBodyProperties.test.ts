import { describe, expect, it } from 'vitest';
import { createTileRegistry } from '../src/core/tiles';
import { Construction } from '../src/construction/construction';
import { calculateRigidBodyProperties } from '../src/physics/rigidBodyProperties';

describe('rigid body properties', () => {
  it('allows normal floating-point rounding when combining chunk mass summaries', () => {
    const registry = createTileRegistry([
      {
        type: 'hull',
        maxHp: 10,
        armor: 0,
        mass: 0.1,
        powerGeneration: 0,
        powerConsumption: 0,
        thrustForce: 0,
        storageCapacity: 0,
        buildCost: {}
      },
      {
        type: 'armor',
        maxHp: 10,
        armor: 1,
        mass: 0.2,
        powerGeneration: 0,
        powerConsumption: 0,
        thrustForce: 0,
        storageCapacity: 0,
        buildCost: {}
      }
    ]);
    const construction = new Construction('fractional-mass', registry);
    construction.placeTile({ x: 31, y: 0 }, 'hull');
    construction.placeTile({ x: 32, y: 0 }, 'armor');

    const properties = calculateRigidBodyProperties(construction);

    expect(properties.mass).toBeCloseTo(0.3);
    expect(properties.centerOfMass?.x).toBeCloseTo(32.1666666667);
    expect(properties.momentOfInertia).toBeGreaterThan(0);
  });
});
