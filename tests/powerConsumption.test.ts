import { describe, expect, it } from 'vitest';
import { createTileRegistry } from '../src/core/tiles';
import { Construction } from '../src/construction/construction';
import { calculatePowerConsumption } from '../src/energy/powerConsumption';

describe('power consumption', () => {
  it('aggregates registry consumers per chunk and excludes destroyed tiles', () => {
    const registry = createTileRegistry([
      {
        type: 'thruster',
        maxHp: 80,
        armor: 2,
        mass: 40,
        powerGeneration: 0,
        powerConsumption: 40,
        storageCapacity: 0,
        buildCost: {}
      }
    ]);
    const construction = new Construction('powered-thrusters', registry);
    construction.placeTile({ x: 0, y: 0 }, 'thruster');
    const destroyedThruster = construction.placeTile(
      { x: 1, y: 0 },
      'thruster'
    );
    construction.placeTile({ x: 32, y: 0 }, 'thruster');
    destroyedThruster.hp = 0;

    expect(calculatePowerConsumption(construction)).toEqual({
      consumerCount: 2,
      totalPowerConsumption: 80,
      chunks: [
        {
          position: { x: 0, y: 0 },
          consumerCount: 1,
          powerConsumption: 40
        },
        {
          position: { x: 1, y: 0 },
          consumerCount: 1,
          powerConsumption: 40
        }
      ]
    });
  });

  it('returns zero consumption for a construction without consumers', () => {
    const construction = new Construction('quiet-ship');
    construction.placeTile({ x: 0, y: 0 }, 'hull');

    expect(calculatePowerConsumption(construction)).toEqual({
      consumerCount: 0,
      totalPowerConsumption: 0,
      chunks: []
    });
  });
});
