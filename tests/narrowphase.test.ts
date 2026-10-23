import { describe, expect, it } from 'vitest';
import { findProjectileCollisionCandidates } from '../src/combat/broadphase';
import type { BroadphaseTarget } from '../src/combat/broadphase';
import { findProjectileImpacts } from '../src/combat/narrowphase';
import { advanceProjectiles, createProjectile } from '../src/combat/projectiles';

function createProjectilePath(
  id: number,
  start: { readonly x: number; readonly y: number },
  direction: { readonly x: number; readonly y: number },
  speed: number,
  collisionRadius: number
) {
  const projectile = createProjectile({
    id,
    ownerId: `ship-${id}`,
    position: start,
    direction,
    shooterVelocity: { x: 0, y: 0 },
    profile: {
      kind: 'laser',
      speed,
      damage: 10,
      collisionRadius,
      lifetimeSeconds: 2
    }
  });
  const result = advanceProjectiles([projectile], 1);
  const movedProjectile = result.active[0];

  if (movedProjectile === undefined) {
    throw new Error('Expected projectile to remain active.');
  }

  return movedProjectile;
}

function createTarget(
  id: string,
  bounds: BroadphaseTarget['bounds']
): BroadphaseTarget {
  return { id, ownerId: `target-owner-${id}`, bounds };
}

describe('projectile collision narrowphase', () => {
  it('finds the earliest swept-circle impact and its contact point', () => {
    const projectile = createProjectilePath(
      1,
      { x: -2, y: 0 },
      { x: 1, y: 0 },
      4,
      0.1
    );
    const target = createTarget('target', {
      minX: -0.1,
      minY: -0.5,
      maxX: 0.1,
      maxY: 0.5
    });
    const candidates = findProjectileCollisionCandidates(
      [projectile],
      [target]
    );
    const impacts = findProjectileImpacts(candidates);

    expect(impacts).toHaveLength(1);
    expect(impacts[0]?.timeOfImpact).toBeCloseTo(0.45);
    expect(impacts[0]?.position.x).toBeCloseTo(-0.2);
    expect(impacts[0]?.position.y).toBe(0);
    expect(impacts[0]?.contactPoint).toEqual({ x: -0.1, y: 0 });
    expect(impacts[0]?.target.id).toBe('target');
  });

  it('rejects expanded-AABB false positives near rounded corners', () => {
    const projectile = createProjectilePath(
      1,
      { x: -0.19, y: -0.19 },
      { x: 1, y: 0 },
      0.000001,
      0.2
    );
    const target = createTarget('corner-target', {
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1
    });
    const candidates = findProjectileCollisionCandidates(
      [projectile],
      [target]
    );

    expect(candidates).toHaveLength(1);
    expect(findProjectileImpacts(candidates)).toEqual([]);
  });

  it('detects a true swept-circle hit on a rounded corner', () => {
    const projectile = createProjectilePath(
      1,
      { x: -1, y: -1 },
      { x: 1, y: 1 },
      2,
      0.2
    );
    const target = createTarget('corner-target', {
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1
    });
    const candidates = findProjectileCollisionCandidates(
      [projectile],
      [target]
    );
    const impacts = findProjectileImpacts(candidates);

    expect(impacts).toHaveLength(1);
    expect(impacts[0]?.timeOfImpact).toBeCloseTo(
      1 / Math.SQRT2 - 0.1
    );
    expect(impacts[0]?.contactPoint).toEqual({ x: 0, y: 0 });
  });

  it('reports initial overlap at time zero and returns stable impact order', () => {
    const firstProjectile = createProjectilePath(
      2,
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0 },
      1,
      0
    );
    const secondProjectile = createProjectilePath(
      1,
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0 },
      1,
      0
    );
    const candidates = findProjectileCollisionCandidates(
      [firstProjectile, secondProjectile],
      [
        createTarget('target-z', {
          minX: 0,
          minY: 0,
          maxX: 1,
          maxY: 1
        }),
        createTarget('target-a', {
          minX: 0,
          minY: 0,
          maxX: 1,
          maxY: 1
        })
      ]
    );

    const impacts = findProjectileImpacts(candidates);

    expect(impacts.map((impact) => `${impact.projectile.id}:${impact.target.id}`))
      .toEqual([
        '1:target-a',
        '1:target-z',
        '2:target-a',
        '2:target-z'
      ]);
    expect(impacts.every((impact) => impact.timeOfImpact === 0)).toBe(true);
  });
});
