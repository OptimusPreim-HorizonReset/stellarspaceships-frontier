import { describe, expect, it } from 'vitest';
import { NpcCombatController } from '../src/ai/combatAI';
import type {
  CombatantState,
  CombatWeaponPolicy
} from '../src/ai/combatAI';

const attacker: CombatantState = {
  id: 'npc-1',
  ownerId: 'pirates',
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  rotation: 0,
  hitPoints: 100
};

const weapon: CombatWeaponPolicy = {
  profile: {
    kind: 'laser',
    speed: 10,
    damage: 20,
    collisionRadius: 0.1,
    lifetimeSeconds: 5
  },
  maximumRange: 100,
  aimToleranceRadians: 0.1,
  cooldownSeconds: 2
};

function createTarget(
  id: string,
  position: { x: number; y: number },
  ownerId = 'player',
  velocity = { x: 0, y: 0 },
  hitPoints = 100
): CombatantState {
  return {
    id,
    ownerId,
    position,
    velocity,
    rotation: 0,
    hitPoints
  };
}

describe('NPC combat AI', () => {
  it('selects the nearest enemy deterministically and launches existing projectiles', () => {
    const controller = new NpcCombatController();
    const decision = controller.update(
      attacker,
      [
        createTarget('far-target', { x: 50, y: 0 }),
        createTarget('target-b', { x: 10, y: 0 }),
        createTarget('target-a', { x: 10, y: 0 })
      ],
      weapon,
      0,
      1
    );

    expect(decision).toMatchObject({
      status: 'fired',
      targetId: 'target-a',
      projectile: {
        id: 1,
        ownerId: 'npc-1',
        kind: 'laser',
        damage: 20
      }
    });
    expect(controller.cooldownRemaining).toBe(2);
  });

  it('leads moving targets and enforces weapon cooldown and aim tolerance', () => {
    const controller = new NpcCombatController();
    const target = createTarget(
      'moving-target',
      { x: 10, y: 0 },
      'player',
      { x: 0, y: 1 }
    );
    const leadWeapon = { ...weapon, aimToleranceRadians: 0.2 };
    const firstShot = controller.update(attacker, [target], leadWeapon, 0, 1);

    if (firstShot.status !== 'fired') {
      throw new Error('Expected combat AI to fire at the intercept point.');
    }

    expect(firstShot.projectile.velocity.y).toBeGreaterThan(0);
    expect(
      controller.update(attacker, [target], leadWeapon, 1, 2).status
    ).toBe('cooldown');
    expect(
      controller.update(attacker, [target], leadWeapon, 1, 3).status
    ).toBe('fired');

    const misaligned = new NpcCombatController();
    expect(
      misaligned.update(
        { ...attacker, rotation: Math.PI },
        [createTarget('ahead', { x: 10, y: 0 })],
        weapon,
        0,
        1
      ).status
    ).toBe('aiming');
  });

  it('ignores friendly and destroyed targets and reports range and inactive states', () => {
    const controller = new NpcCombatController();

    expect(
      controller.update(
        attacker,
        [
          createTarget('friendly', { x: 1, y: 0 }, 'pirates'),
          createTarget('destroyed', { x: 2, y: 0 }, 'player', { x: 0, y: 0 }, 0)
        ],
        weapon,
        1,
        1
      ).status
    ).toBe('no-target');

    expect(
      controller.update(
        attacker,
        [createTarget('distant', { x: 200, y: 0 })],
        weapon,
        0,
        2
      )
    ).toMatchObject({ status: 'out-of-range', targetId: 'distant' });

    expect(
      controller.update(
        { ...attacker, hitPoints: 0 },
        [createTarget('enemy', { x: 1, y: 0 })],
        weapon,
        0,
        3
      ).status
    ).toBe('inactive');
  });

  it('rejects invalid combatants, policies, duplicate target IDs, and time', () => {
    const controller = new NpcCombatController();

    expect(() =>
      controller.update(attacker, [], weapon, -1, 1)
    ).toThrow('Combat AI delta time must be finite and non-negative.');
    expect(() =>
      controller.update(attacker, [], { ...weapon, maximumRange: 0 }, 0, 1)
    ).toThrow('Combat weapon range must be finite and positive.');
    expect(() =>
      controller.update(
        attacker,
        [
          createTarget('duplicate', { x: 2, y: 0 }),
          createTarget('duplicate', { x: 3, y: 0 })
        ],
        weapon,
        0,
        1
      )
    ).toThrow('Duplicate combat target ID: duplicate.');
  });
});
