import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';
import { calculatePowerBalance } from '../src/energy/powerBalance';

describe('chunk power balance', () => {
  it('calculates per-chunk and construction net power', () => {
    const construction = new Construction('balanced-ship');
    construction.placeTile({ x: 0, y: 0 }, 'reactor');
    construction.placeTile({ x: 1, y: 0 }, 'thruster');
    construction.placeTile({ x: 32, y: 0 }, 'reactor');
    construction.placeTile({ x: 33, y: 0 }, 'thruster');

    expect(calculatePowerBalance(construction)).toEqual({
      totalPowerGeneration: 2000,
      totalPowerConsumption: 50,
      totalNetPower: 1950,
      chunks: [
        {
          position: { x: 0, y: 0 },
          powerGeneration: 1000,
          powerConsumption: 25,
          netPower: 975
        },
        {
          position: { x: 1, y: 0 },
          powerGeneration: 1000,
          powerConsumption: 25,
          netPower: 975
        }
      ]
    });
  });

  it('keeps chunk deficits local instead of transferring power across chunks', () => {
    const construction = new Construction('isolated-consumer');
    construction.placeTile({ x: 32, y: 0 }, 'thruster');
    construction.placeTile({ x: 0, y: 0 }, 'reactor');

    const report = calculatePowerBalance(construction);

    expect(report.totalNetPower).toBe(975);
    expect(report.chunks).toEqual([
      {
        position: { x: 0, y: 0 },
        powerGeneration: 1000,
        powerConsumption: 0,
        netPower: 1000
      },
      {
        position: { x: 1, y: 0 },
        powerGeneration: 0,
        powerConsumption: 25,
        netPower: -25
      }
    ]);
  });
});
