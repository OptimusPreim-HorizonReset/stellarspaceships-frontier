import { describe, expect, it } from 'vitest';
import {
  advanceProjectiles,
  createProjectile
} from '../src/combat/projectiles';
import type { ProjectileProfile } from '../src/combat/projectiles';

function createProfile(
  kind: ProjectileProfile['kind'],
  lifetimeSeconds = 2
): ProjectileProfile {
  return {
    kind,
    speed: 10,
    damage: 25,
    collisionRadius: 0.5,
    lifetimeSeconds
  };
}

describe('projectile simulation', () => {
  it.each(['laser', 'cannon', 'rocket'] as const)(
    'creates a %s projectile with inherited ship velocity',
    (kind) => {
      const projectile = createProjectile({
        id: 1,
        ownerId: 'ship-1',
        position: { x: 2, y: 3 },
        direction: { x: 3, y: 4 },
        shooterVelocity: { x: 2, y: -1 },
        profile: createProfile(kind)
      });

      expect(projectile).toMatchObject({
        id: 1,
        ownerId: 'ship-1',
        kind,
        position: { x: 2, y: 3 },
        previousPosition: { x: 2, y: 3 },
        velocity: { x: 8, y: 7 },
        damage: 25,
        collisionRadius: 0.5,
        remainingLifetimeSeconds: 2
      });
    }
  );

  it('advances motion and retains expired endpoints for collision checks', () => {
    const activeProjectile = createProjectile({
      id: 1,
      ownerId: 'ship-1',
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shooterVelocity: { x: 0, y: 0 },
      profile: createProfile('cannon')
    });
    const expiringProjectile = createProjectile({
      id: 2,
      ownerId: 'ship-2',
      position: { x: 0, y: 0 },
      direction: { x: 0, y: 1 },
      shooterVelocity: { x: 0, y: 0 },
      profile: createProfile('rocket', 0.25)
    });

    const result = advanceProjectiles(
      [activeProjectile, expiringProjectile],
      0.5
    );

    expect(result.active).toHaveLength(1);
    expect(result.active[0]).toMatchObject({
      id: 1,
      previousPosition: { x: 0, y: 0 },
      position: { x: 5, y: 0 },
      remainingLifetimeSeconds: 1.5
    });
    expect(result.expired).toHaveLength(1);
    expect(result.expired[0]).toMatchObject({
      id: 2,
      previousPosition: { x: 0, y: 0 },
      position: { x: 0, y: 2.5 },
      remainingLifetimeSeconds: 0
    });
    expect(activeProjectile.position).toEqual({ x: 0, y: 0 });
    expect(expiringProjectile.position).toEqual({ x: 0, y: 0 });
  });

  it('rejects invalid launches and time steps', () => {
    const launch = {
      id: 1,
      ownerId: 'ship-1',
      position: { x: 0, y: 0 },
      direction: { x: 0, y: 0 },
      shooterVelocity: { x: 0, y: 0 },
      profile: createProfile('laser')
    };

    expect(() => createProjectile(launch)).toThrow(
      'Projectile direction must be non-zero and finite.'
    );
    expect(() =>
      createProjectile({
        ...launch,
        direction: { x: 1, y: 0 },
        profile: { ...launch.profile, speed: 0 }
      })
    ).toThrow('Projectile profile values are outside valid ranges.');
    expect(() => advanceProjectiles([], -0.1)).toThrow(
      'Projectile delta time must be finite and non-negative.'
    );
  });

  it('rejects duplicate IDs in one projectile simulation step', () => {
    const projectile = createProjectile({
      id: 1,
      ownerId: 'ship-1',
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shooterVelocity: { x: 0, y: 0 },
      profile: createProfile('laser')
    });

    expect(() =>
      advanceProjectiles(
        [projectile, { ...projectile, ownerId: 'ship-2' }],
        0.1
      )
    ).toThrow('Duplicate projectile ID: 1.');
  });
});
