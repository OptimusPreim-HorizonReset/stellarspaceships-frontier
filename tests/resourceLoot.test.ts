import { describe, expect, it } from 'vitest';
import { applyLocalDamage } from '../src/combat/damage';
import { Asteroid } from '../src/mining/asteroid';
import {
  createAsteroidResourceDrop,
  ResourceInventory
} from '../src/mining/resourceLoot';

function createAsteroid(): Asteroid {
  return new Asteroid({
    id: 'loot-asteroid',
    state: {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      angularVelocity: 0
    },
    tiles: [
      {
        position: { x: 0, y: 0 },
        resourceType: 'ore',
        resourceAmount: 3
      }
    ]
  });
}

describe('asteroid resource loot', () => {
  it('creates a resource drop exactly once when a rock tile is destroyed', () => {
    const asteroid = createAsteroid();
    const damageResult = applyLocalDamage(
      asteroid.construction,
      { x: 0, y: 0 },
      1000
    );

    const drop = createAsteroidResourceDrop(asteroid, damageResult);

    expect(drop).toEqual({
      id: 'loot-asteroid:tile:1',
      asteroidId: 'loot-asteroid',
      sourceTileId: 1,
      resourceType: 'ore',
      amount: 3
    });
    expect(asteroid.getResourceDeposit(1)).toBeUndefined();
    expect(createAsteroidResourceDrop(asteroid, damageResult)).toBeUndefined();
  });

  it('does not create loot for misses or surviving tiles', () => {
    const asteroid = createAsteroid();

    expect(
      createAsteroidResourceDrop(asteroid, {
        status: 'miss',
        position: { x: 0, y: 0 }
      })
    ).toBeUndefined();
    expect(
      createAsteroidResourceDrop(
        asteroid,
        applyLocalDamage(asteroid.construction, { x: 0, y: 0 }, 10)
      )
    ).toBeUndefined();
    expect(asteroid.getResourceDeposit(1)).toEqual({
      resourceType: 'ore',
      amount: 3
    });
  });

  it('collects each drop once and tracks totals by resource type', () => {
    const asteroid = createAsteroid();
    const damageResult = applyLocalDamage(
      asteroid.construction,
      { x: 0, y: 0 },
      1000
    );
    const drop = createAsteroidResourceDrop(asteroid, damageResult);

    if (drop === undefined) {
      throw new Error('Expected destroyed asteroid tile to create resource loot.');
    }

    const inventory = new ResourceInventory();

    expect(inventory.collect(drop)).toEqual({
      status: 'collected',
      dropId: drop.id,
      resourceType: 'ore',
      amount: 3,
      totalAmount: 3
    });
    expect(inventory.collect(drop)).toEqual({
      status: 'already-collected',
      dropId: drop.id
    });
    expect(inventory.getAmount('ore')).toBe(3);
    expect(inventory.getContents()).toEqual({ ore: 3 });
  });

  it('transfers resources atomically and reports insufficient inventory', () => {
    const source = new ResourceInventory();
    const destination = new ResourceInventory();
    const drop = {
      id: 'ship-1:drop-1',
      asteroidId: 'asteroid-1',
      sourceTileId: 1,
      resourceType: 'ore' as const,
      amount: 5
    };
    source.collect(drop);

    expect(source.transferTo(destination, 'ore', 3)).toEqual({
      status: 'transferred',
      resourceType: 'ore',
      amount: 3,
      sourceRemaining: 2,
      destinationTotal: 3
    });
    expect(source.transferTo(destination, 'ore', 4)).toEqual({
      status: 'insufficient-resources',
      resourceType: 'ore',
      requestedAmount: 4,
      availableAmount: 2
    });
    expect(source.getAmount('ore')).toBe(2);
    expect(destination.getAmount('ore')).toBe(3);
  });
});
