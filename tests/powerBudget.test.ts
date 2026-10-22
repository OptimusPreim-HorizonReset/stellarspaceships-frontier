import { describe, expect, it } from 'vitest';
import { chunkKey } from '../src/core/coordinates';
import { createTileRegistry } from '../src/core/tiles';
import { Construction } from '../src/construction/construction';
import { calculateAvailablePowerByChunk } from '../src/energy/powerBudget';

describe('chunk power budgets', () => {
  it('reserves higher priorities but leaves same-tier power to the allocator', () => {
    const construction = new Construction('power-budget');
    construction.placeTile({ x: 0, y: 0 }, 'reactor');
    construction.placeTile({ x: 1, y: 0 }, 'thruster');

    expect(
      calculateAvailablePowerByChunk(construction, 'propulsion').get(
        chunkKey({ x: 0, y: 0 })
      )
    ).toBe(1000);
    expect(
      calculateAvailablePowerByChunk(construction, 'shields').get(
        chunkKey({ x: 0, y: 0 })
      )
    ).toBe(975);
  });

  it('subtracts higher-priority consumers within each chunk only', () => {
    const registry = createTileRegistry([
      {
        type: 'reactor',
        maxHp: 120,
        armor: 5,
        mass: 100,
        powerGeneration: 1000,
        powerConsumption: 0,
        thrustForce: 0,
        storageCapacity: 0,
        buildCost: {}
      },
      {
        type: 'thruster',
        maxHp: 80,
        armor: 2,
        mass: 40,
        powerGeneration: 0,
        powerConsumption: 100,
        powerPriority: 'lifeSupport',
        thrustForce: 100,
        storageCapacity: 0,
        buildCost: {}
      }
    ]);
    const construction = new Construction('isolated-power-chunks', registry);
    construction.placeTile({ x: 0, y: 0 }, 'reactor');
    construction.placeTile({ x: 1, y: 0 }, 'thruster');
    construction.placeTile({ x: 32, y: 0 }, 'thruster');
    const budgets = calculateAvailablePowerByChunk(
      construction,
      'propulsion'
    );

    expect(budgets.get(chunkKey({ x: 0, y: 0 }))).toBe(900);
    expect(budgets.get(chunkKey({ x: 1, y: 0 }))).toBe(0);
  });

  it('returns a zero budget for chunks containing free thrusters', () => {
    const registry = createTileRegistry([
      {
        type: 'thruster',
        maxHp: 80,
        armor: 2,
        mass: 40,
        powerGeneration: 0,
        powerConsumption: 0,
        thrustForce: 100,
        storageCapacity: 0,
        buildCost: {}
      }
    ]);
    const construction = new Construction('free-thruster', registry);
    construction.placeTile({ x: 0, y: 0 }, 'thruster');

    expect(
      calculateAvailablePowerByChunk(construction, 'propulsion').get(
        chunkKey({ x: 0, y: 0 })
      )
    ).toBe(0);
  });
});
