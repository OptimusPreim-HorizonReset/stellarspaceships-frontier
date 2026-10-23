import { describe, expect, it } from 'vitest';
import {
  applyLocalDamage,
  applyProjectileImpactDamage
} from '../src/combat/damage';
import { findProjectileCollisionCandidates } from '../src/combat/broadphase';
import { findProjectileImpacts } from '../src/combat/narrowphase';
import { advanceProjectiles, createProjectile } from '../src/combat/projectiles';
import { Construction } from '../src/construction/construction';

describe('local tile damage', () => {
  it('reduces hit points without damaging neighboring tiles', () => {
    const construction = new Construction('damaged-ship');
    const hull = construction.placeTile({ x: 0, y: 0 }, 'hull');
    const armor = construction.placeTile({ x: 1, y: 0 }, 'armor');

    const result = applyLocalDamage(construction, { x: 0, y: 0 }, 25);

    expect(result).toEqual({
      status: 'damaged',
      position: { x: 0, y: 0 },
      tileId: hull.id,
      damageApplied: 25,
      remainingHitPoints: 75
    });
    expect(construction.getTile({ x: 0, y: 0 })?.hp).toBe(75);
    expect(construction.getTile({ x: 1, y: 0 })?.hp).toBe(150);
    expect(construction.tileCount).toBe(2);
    expect(armor.hp).toBe(150);
  });

  it('removes destroyed tiles, updates chunks, and exposes disconnected fragments', () => {
    const construction = new Construction('fragmented-ship');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    const bridge = construction.placeTile({ x: 1, y: 0 }, 'armor');
    construction.placeTile({ x: 2, y: 0 }, 'reactor');

    const result = applyLocalDamage(construction, { x: 1, y: 0 }, 500);

    expect(result).toMatchObject({
      status: 'destroyed',
      position: { x: 1, y: 0 },
      destroyedTile: { id: bridge.id, hp: 0 },
      damageApplied: 150,
      remainingHitPoints: 0
    });
    expect(construction.getTile({ x: 1, y: 0 })).toBeUndefined();
    expect(construction.tileCount).toBe(2);
    expect(construction.getConnectedComponents()).toHaveLength(2);

    const fragments = construction.splitDisconnected(
      (sourceId, index) => `${sourceId}-${index + 1}`
    );

    expect(fragments.map((fragment) => fragment.tileCount)).toEqual([1, 1]);
  });

  it('removes empty chunks and reports misses without mutating the construction', () => {
    const construction = new Construction('chunk-cleanup');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    construction.placeTile({ x: 32, y: 0 }, 'armor');

    const miss = applyLocalDamage(construction, { x: 20, y: 20 }, 5);
    const destroyed = applyLocalDamage(construction, { x: 32, y: 0 }, 200);

    expect(miss.status).toBe('miss');
    expect(construction.chunkCount).toBe(1);
    expect(construction.tileCount).toBe(1);
    expect(destroyed.status).toBe('destroyed');
  });

  it('rejects invalid damage without changing tile hit points', () => {
    const construction = new Construction('invalid-damage');
    const tile = construction.placeTile({ x: 0, y: 0 }, 'hull');

    expect(() =>
      applyLocalDamage(construction, { x: 0, y: 0 }, Number.NaN)
    ).toThrow('Damage must be finite and positive.');
    expect(() =>
      applyLocalDamage(construction, { x: 0, y: 0 }, 0)
    ).toThrow('Damage must be finite and positive.');
    expect(() =>
      applyLocalDamage(construction, { x: 0, y: 0 }, Number.MIN_VALUE)
    ).toThrow('Damage is too small to change tile hit points.');
    expect(tile.hp).toBe(100);
  });

  it('applies collision impact damage to the matching local tile', () => {
    const construction = new Construction('impact-target');
    const tile = construction.placeTile({ x: 0, y: 0 }, 'hull');
    const targetId = `${construction.id}:tile-${tile.id}`;
    const projectile = createProjectile({
      id: 1,
      ownerId: 'attacker',
      position: { x: -1, y: 0.5 },
      direction: { x: 1, y: 0 },
      shooterVelocity: { x: 0, y: 0 },
      profile: {
        kind: 'cannon',
        speed: 2,
        damage: 25,
        collisionRadius: 0.1,
        lifetimeSeconds: 2
      }
    });
    const advanced = advanceProjectiles([projectile], 1).active[0];

    if (advanced === undefined) {
      throw new Error('Expected projectile to remain active.');
    }

    const candidates = findProjectileCollisionCandidates([advanced], [
      {
        id: targetId,
        ownerId: construction.id,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
      }
    ]);
    const impact = findProjectileImpacts(candidates)[0];

    if (impact === undefined) {
      throw new Error('Expected projectile to hit the target tile.');
    }

    const result = applyProjectileImpactDamage(impact, {
      id: targetId,
      construction,
      position: { x: 0, y: 0 }
    });

    expect(result).toMatchObject({
      status: 'damaged',
      tileId: tile.id,
      damageApplied: 25,
      remainingHitPoints: 75
    });
    expect(tile.hp).toBe(75);
    expect(construction.getChunkState({ x: 0, y: 0 })).toBe('combat');
  });
});
