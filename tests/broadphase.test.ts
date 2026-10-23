import { describe, expect, it } from 'vitest';
import {
  findProjectileCollisionCandidates
} from '../src/combat/broadphase';
import type {
  AxisAlignedBounds,
  BroadphaseTarget
} from '../src/combat/broadphase';
import { advanceProjectiles, createProjectile } from '../src/combat/projectiles';

function createTarget(
  id: string,
  ownerId: string,
  bounds: AxisAlignedBounds
): BroadphaseTarget {
  return { id, ownerId, bounds };
}

function createMovedProjectile(id: number, ownerId: string) {
  const projectile = createProjectile({
    id,
    ownerId,
    position: { x: 31, y: 0 },
    direction: { x: 1, y: 0 },
    shooterVelocity: { x: 0, y: 0 },
    profile: {
      kind: 'cannon',
      speed: 2,
      damage: 10,
      collisionRadius: 0.5,
      lifetimeSeconds: 3
    }
  });
  const result = advanceProjectiles([projectile], 1);
  const movedProjectile = result.active[0];

  if (movedProjectile === undefined) {
    throw new Error('Expected projectile to remain active.');
  }

  return movedProjectile;
}

describe('projectile collision broadphase', () => {
  it('uses swept bounds across chunk edges and deduplicates candidates', () => {
    const projectile = createMovedProjectile(1, 'ship-1');
    const candidates = findProjectileCollisionCandidates([projectile], [
      createTarget('self', 'ship-1', {
        minX: 31.75,
        minY: -0.25,
        maxX: 32.25,
        maxY: 0.25
      }),
      createTarget('hit', 'ship-2', {
        minX: 31.75,
        minY: -0.25,
        maxX: 32.25,
        maxY: 0.25
      }),
      createTarget('same-cell-clear', 'ship-3', {
        minX: 1,
        minY: 10,
        maxX: 2,
        maxY: 11
      }),
      createTarget('far', 'ship-4', {
        minX: 100,
        minY: 100,
        maxX: 101,
        maxY: 101
      })
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.target.id).toBe('hit');
    expect(candidates[0]?.projectile.id).toBe(1);
  });

  it('returns unique candidates in deterministic ID order', () => {
    const first = createMovedProjectile(2, 'ship-1');
    const second = createMovedProjectile(1, 'ship-3');
    const candidates = findProjectileCollisionCandidates([first, second], [
      createTarget('target-z', 'ship-2', {
        minX: 31.75,
        minY: -0.25,
        maxX: 32.25,
        maxY: 0.25
      }),
      createTarget('target-a', 'ship-2', {
        minX: 31.75,
        minY: -0.25,
        maxX: 32.25,
        maxY: 0.25
      })
    ]);

    expect(
      candidates.map(
        ({ projectile, target }) => `${projectile.id}:${target.id}`
      )
    ).toEqual([
      '1:target-a',
      '1:target-z',
      '2:target-a',
      '2:target-z'
    ]);
  });

  it('rejects invalid or duplicate collision inputs', () => {
    const projectile = createMovedProjectile(1, 'ship-1');
    const target = createTarget('target', 'ship-2', {
      minX: 1,
      minY: 1,
      maxX: 0,
      maxY: 2
    });

    expect(() =>
      findProjectileCollisionCandidates([projectile], [target])
    ).toThrow('Collision target target bounds minimums must not exceed maximums.');
    expect(() =>
      findProjectileCollisionCandidates(
        [projectile, { ...projectile, ownerId: 'ship-3' }],
        []
      )
    ).toThrow('Duplicate projectile ID: 1.');
    expect(() =>
      findProjectileCollisionCandidates([], [
        createTarget('same', 'ship-1', {
          minX: 0,
          minY: 0,
          maxX: 1,
          maxY: 1
        }),
        createTarget('same', 'ship-2', {
          minX: 2,
          minY: 2,
          maxX: 3,
          maxY: 3
        })
      ])
    ).toThrow('Duplicate collision target ID: same.');
  });
});
