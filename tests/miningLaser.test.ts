import { describe, expect, it } from 'vitest';
import { Asteroid } from '../src/mining/asteroid';
import { fireMiningLaser } from '../src/mining/miningLaser';
import type {
  MiningLaserCommand,
  MiningLaserProfile
} from '../src/mining/miningLaser';

const profile: MiningLaserProfile = {
  range: 5,
  damagePerSecond: 10,
  powerDemand: 100
};

function createAsteroid(): Asteroid {
  return new Asteroid({
    id: 'laser-target',
    state: {
      position: { x: 10, y: 20 },
      velocity: { x: 0, y: 0 },
      rotation: Math.PI / 2,
      angularVelocity: 0
    },
    tiles: [
      {
        position: { x: 0, y: 0 },
        resourceType: 'ore',
        resourceAmount: 3,
        hitPoints: 80
      },
      {
        position: { x: 3, y: 0 },
        resourceType: 'ice',
        resourceAmount: 2
      }
    ]
  });
}

function createCommand(
  overrides: Partial<MiningLaserCommand> = {}
): MiningLaserCommand {
  return {
    projectileId: 1,
    ownerId: 'miner',
    origin: { x: 9.5, y: 19 },
    direction: { x: 0, y: 1 },
    deltaTimeSeconds: 1,
    allocatedPower: 50,
    ...overrides
  };
}

describe('mining laser', () => {
  it('hits the nearest rotated asteroid tile and scales damage with power', () => {
    const asteroid = createAsteroid();
    const result = fireMiningLaser(
      asteroid,
      profile,
      createCommand()
    );

    expect(result.status).toBe('hit');

    if (result.status !== 'hit') {
      throw new Error('Expected the mining laser to hit an asteroid tile.');
    }

    expect(result.requiredPower).toBe(100);
    expect(result.allocatedPower).toBe(50);
    expect(result.tilePosition).toEqual({ x: 0, y: 0 });
    expect(result.worldPosition.x).toBeCloseTo(9.5);
    expect(result.worldPosition.y).toBeCloseTo(20);
    expect(result.damage).toMatchObject({
      status: 'damaged',
      damageApplied: 5,
      remainingHitPoints: 75
    });
    expect(asteroid.construction.getTile({ x: 3, y: 0 })?.hp).toBe(100);
    expect(asteroid.construction.getChunkState({ x: 0, y: 0 })).toBe('active');
  });

  it('does not change tiles when unpowered or when the beam misses', () => {
    const asteroid = createAsteroid();
    const tile = asteroid.construction.getTile({ x: 0, y: 0 });

    const unpowered = fireMiningLaser(
      asteroid,
      profile,
      createCommand({ allocatedPower: 0 })
    );
    const miss = fireMiningLaser(
      asteroid,
      profile,
      createCommand({
        origin: { x: 100, y: 100 },
        direction: { x: 1, y: 0 },
        allocatedPower: 100
      })
    );

    expect(unpowered.status).toBe('unpowered');
    expect(miss.status).toBe('miss');
    expect(tile?.hp).toBe(80);
    expect(asteroid.construction.getChunkState({ x: 0, y: 0 })).toBe(
      'dormant'
    );
  });

  it('destroys the first tile and creates its resource drop', () => {
    const asteroid = createAsteroid();
    const tile = asteroid.construction.getTile({ x: 0, y: 0 });

    if (tile === undefined) {
      throw new Error('Asteroid tile fixture is missing.');
    }

    const result = fireMiningLaser(
      asteroid,
      { ...profile, damagePerSecond: 100 },
      createCommand({ allocatedPower: 100 })
    );

    expect(result.status).toBe('hit');

    if (result.status !== 'hit') {
      throw new Error('Expected the mining laser to destroy the tile.');
    }

    expect(result.damage).toMatchObject({
      status: 'destroyed',
      destroyedTile: { id: tile.id, hp: 0 }
    });
    expect(result.resourceDrop).toEqual({
      id: `${asteroid.id}:tile:${tile.id}`,
      asteroidId: asteroid.id,
      sourceTileId: tile.id,
      resourceType: 'ore',
      amount: 3
    });
    expect(asteroid.construction.getTile({ x: 0, y: 0 })).toBeUndefined();
    expect(asteroid.getResourceDeposit(tile.id)).toBeUndefined();
  });

  it('rejects invalid profiles and commands', () => {
    const asteroid = createAsteroid();

    expect(() =>
      fireMiningLaser(asteroid, { ...profile, range: 0 }, createCommand())
    ).toThrow('Mining laser profile values must be positive.');
    expect(() =>
      fireMiningLaser(
        asteroid,
        profile,
        createCommand({ direction: { x: 0, y: 0 } })
      )
    ).toThrow('Mining laser direction must be non-zero.');
  });
});
