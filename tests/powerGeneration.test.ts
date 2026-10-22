import { describe, expect, it } from 'vitest';
import { createTileRegistry } from '../src/core/tiles';
import { Construction } from '../src/construction/construction';
import { calculatePowerGeneration } from '../src/energy/powerGeneration';
import { calculatePowerFlows } from '../src/energy/powerFlows';

describe('power generation', () => {
  it('aggregates registered generation by chunk and construction', () => {
    const construction = new Construction('reactor-ship');

    construction.placeTile({ x: 0, y: 0 }, 'reactor');
    construction.placeTile({ x: 1, y: 0 }, 'reactor');
    construction.placeTile({ x: 32, y: 0 }, 'reactor');
    construction.placeTile({ x: 2, y: 0 }, 'battery');
    construction.placeTile({ x: 3, y: 0 }, 'thruster');

    const report = calculatePowerGeneration(construction);

    expect(report).toEqual({
      generatorCount: 3,
      totalPowerGeneration: 3000,
      chunks: [
        {
          position: { x: 0, y: 0 },
          generatorCount: 2,
          powerGeneration: 2000
        },
        {
          position: { x: 1, y: 0 },
          generatorCount: 1,
          powerGeneration: 1000
        }
      ]
    });
  });

  it('uses registry values and excludes destroyed generators', () => {
    const registry = createTileRegistry([
      {
        type: 'reactor',
        maxHp: 200,
        armor: 5,
        mass: 100,
        powerGeneration: 375,
        powerConsumption: 0,
        storageCapacity: 0,
        buildCost: {}
      }
    ]);
    const construction = new Construction('custom-reactor', registry);
    const liveReactor = construction.placeTile({ x: 0, y: 0 }, 'reactor');
    const destroyedReactor = construction.placeTile({ x: 1, y: 0 }, 'reactor');
    destroyedReactor.hp = 0;

    expect(calculatePowerGeneration(construction)).toEqual({
      generatorCount: 1,
      totalPowerGeneration: 375,
      chunks: [
        {
          position: { x: 0, y: 0 },
          generatorCount: 1,
          powerGeneration: 375
        }
      ]
    });
    expect(liveReactor.hp).toBe(200);
  });

  it('returns an empty report when there are no generating tiles', () => {
    const construction = new Construction('unpowered-ship');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    construction.placeTile({ x: 1, y: 0 }, 'battery');

    expect(calculatePowerGeneration(construction)).toEqual({
      generatorCount: 0,
      totalPowerGeneration: 0,
      chunks: []
    });
  });

  it('calculates generation and consumption in one chunk aggregation pass', () => {
    const construction = new Construction('mixed-power-ship');
    construction.placeTile({ x: 0, y: 0 }, 'reactor');
    construction.placeTile({ x: 1, y: 0 }, 'thruster');
    construction.placeTile({ x: 32, y: 0 }, 'thruster');
    construction.placeTile({ x: 33, y: 0 }, 'battery');

    expect(calculatePowerFlows(construction)).toEqual({
      generatorCount: 1,
      totalPowerGeneration: 1000,
      consumerCount: 2,
      totalPowerConsumption: 50,
      chunks: [
        {
          position: { x: 0, y: 0 },
          generatorCount: 1,
          powerGeneration: 1000,
          consumerCount: 1,
          powerConsumption: 25
        },
        {
          position: { x: 1, y: 0 },
          generatorCount: 0,
          powerGeneration: 0,
          consumerCount: 1,
          powerConsumption: 25
        }
      ]
    });
  });
});
