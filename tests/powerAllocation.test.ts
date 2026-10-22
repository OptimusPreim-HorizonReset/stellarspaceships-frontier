import { describe, expect, it } from 'vitest';
import {
  allocateChunkPower,
  type PowerDemand
} from '../src/energy/powerAllocation';

describe('chunk power priority allocation', () => {
  it('serves higher priorities first and proportionally shares a partial tier', () => {
    const demands: PowerDemand[] = [
      { consumerId: 'shield-b', priority: 'shields', requestedPower: 50 },
      {
        consumerId: 'life-support',
        priority: 'lifeSupport',
        requestedPower: 80
      },
      { consumerId: 'weapon', priority: 'weapons', requestedPower: 20 },
      { consumerId: 'shield-a', priority: 'shields', requestedPower: 50 }
    ];

    const report = allocateChunkPower(100, demands);

    expect(report.availablePower).toBe(100);
    expect(report.requestedPower).toBe(200);
    expect(report.allocatedPower).toBe(100);
    expect(report.unusedPower).toBe(0);
    expect(report.allocations).toEqual([
      {
        consumerId: 'life-support',
        priority: 'lifeSupport',
        requestedPower: 80,
        allocatedPower: 80
      },
      {
        consumerId: 'shield-a',
        priority: 'shields',
        requestedPower: 50,
        allocatedPower: 10
      },
      {
        consumerId: 'shield-b',
        priority: 'shields',
        requestedPower: 50,
        allocatedPower: 10
      },
      {
        consumerId: 'weapon',
        priority: 'weapons',
        requestedPower: 20,
        allocatedPower: 0
      }
    ]);
  });

  it('reports unused supply when demand is lower than generation', () => {
    const report = allocateChunkPower(100, [
      { consumerId: 'comfort', priority: 'comfort', requestedPower: 20 }
    ]);

    expect(report.allocatedPower).toBe(20);
    expect(report.unusedPower).toBe(80);
  });

  it('prioritizes propulsion before shields after life support', () => {
    const report = allocateChunkPower(60, [
      { consumerId: 'shield', priority: 'shields', requestedPower: 50 },
      { consumerId: 'thruster', priority: 'propulsion', requestedPower: 30 },
      {
        consumerId: 'life-support',
        priority: 'lifeSupport',
        requestedPower: 20
      }
    ]);

    expect(report.allocations).toEqual([
      {
        consumerId: 'life-support',
        priority: 'lifeSupport',
        requestedPower: 20,
        allocatedPower: 20
      },
      {
        consumerId: 'thruster',
        priority: 'propulsion',
        requestedPower: 30,
        allocatedPower: 30
      },
      {
        consumerId: 'shield',
        priority: 'shields',
        requestedPower: 50,
        allocatedPower: 10
      }
    ]);
  });

  it('rejects invalid supply, duplicate consumers, and invalid requests', () => {
    expect(() => allocateChunkPower(-1, [])).toThrow(
      'Available power must be a non-negative finite number.'
    );
    expect(() =>
      allocateChunkPower(100, [
        { consumerId: 'same', priority: 'shields', requestedPower: 10 },
        { consumerId: 'same', priority: 'weapons', requestedPower: 10 }
      ])
    ).toThrow('Duplicate power consumer ID: same.');
    expect(() =>
      allocateChunkPower(100, [
        { consumerId: 'broken', priority: 'weapons', requestedPower: -10 }
      ])
    ).toThrow('Invalid power demand for consumer broken.');
  });
});
