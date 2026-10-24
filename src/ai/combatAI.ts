import type { Vector2 } from '../physics/rigidBody';
import {
  createProjectile,
  isProjectileKind
} from '../combat/projectiles';
import type {
  Projectile,
  ProjectileProfile
} from '../combat/projectiles';

export interface CombatantState {
  readonly id: string;
  readonly ownerId: string;
  readonly position: Vector2;
  readonly velocity: Vector2;
  readonly rotation: number;
  readonly hitPoints: number;
}

export interface CombatWeaponPolicy {
  readonly profile: ProjectileProfile;
  readonly maximumRange: number;
  readonly aimToleranceRadians: number;
  readonly cooldownSeconds: number;
}

interface CombatDecisionBase {
  readonly targetId: string | null;
  readonly desiredHeadingRadians: number;
  readonly cooldownRemainingSeconds: number;
}

export type NpcCombatDecision =
  | (CombatDecisionBase & {
      readonly status: 'inactive' | 'no-target';
      readonly targetId: null;
    })
  | (CombatDecisionBase & {
      readonly status: 'cooldown' | 'out-of-range' | 'aiming';
      readonly targetId: string;
    })
  | (CombatDecisionBase & {
      readonly status: 'fired';
      readonly targetId: string;
      readonly projectile: Projectile;
    });

function assertCombatant(value: CombatantState, label: string): void {
  if (
    typeof value.id !== 'string' ||
    value.id.trim().length === 0 ||
    typeof value.ownerId !== 'string' ||
    value.ownerId.trim().length === 0
  ) {
    throw new TypeError(`${label} IDs must not be empty.`);
  }

  if (
    !Number.isFinite(value.position.x) ||
    !Number.isFinite(value.position.y) ||
    !Number.isFinite(value.velocity.x) ||
    !Number.isFinite(value.velocity.y) ||
    !Number.isFinite(value.rotation) ||
    !Number.isFinite(value.hitPoints) ||
    value.hitPoints < 0
  ) {
    throw new RangeError(`${label} state values must be finite and valid.`);
  }
}

function assertWeaponPolicy(policy: CombatWeaponPolicy): void {
  const profile = policy.profile;

  if (!isProjectileKind(profile.kind)) {
    throw new TypeError(`Unknown projectile kind: ${String(profile.kind)}.`);
  }

  if (
    !Number.isFinite(profile.speed) ||
    profile.speed <= 0 ||
    !Number.isFinite(profile.damage) ||
    profile.damage <= 0 ||
    !Number.isFinite(profile.collisionRadius) ||
    profile.collisionRadius < 0 ||
    !Number.isFinite(profile.lifetimeSeconds) ||
    profile.lifetimeSeconds <= 0
  ) {
    throw new RangeError('Combat projectile profile values are invalid.');
  }

  if (!Number.isFinite(policy.maximumRange) || policy.maximumRange <= 0) {
    throw new RangeError('Combat weapon range must be finite and positive.');
  }

  if (
    !Number.isFinite(policy.aimToleranceRadians) ||
    policy.aimToleranceRadians < 0 ||
    policy.aimToleranceRadians > Math.PI
  ) {
    throw new RangeError('Combat aim tolerance must be within 0..PI radians.');
  }

  if (!Number.isFinite(policy.cooldownSeconds) || policy.cooldownSeconds < 0) {
    throw new RangeError('Combat weapon cooldown must be finite and non-negative.');
  }
}

function normalizeAngle(angleRadians: number): number {
  const fullTurn = Math.PI * 2;
  return (
    (((angleRadians + Math.PI) % fullTurn) + fullTurn) % fullTurn -
    Math.PI
  );
}

function estimateInterceptSeconds(
  relativePosition: Vector2,
  relativeVelocity: Vector2,
  projectileSpeed: number
): number {
  const a =
    relativeVelocity.x * relativeVelocity.x +
    relativeVelocity.y * relativeVelocity.y -
    projectileSpeed * projectileSpeed;
  const b =
    2 *
    (relativePosition.x * relativeVelocity.x +
      relativePosition.y * relativeVelocity.y);
  const c =
    relativePosition.x * relativePosition.x +
    relativePosition.y * relativePosition.y;

  if (c === 0) {
    return 0;
  }

  if (Math.abs(a) < 1e-9) {
    const linearSolution = b < 0 ? -c / b : Number.NaN;
    return Number.isFinite(linearSolution) && linearSolution > 0
      ? linearSolution
      : 0;
  }

  const discriminant = b * b - 4 * a * c;

  if (!Number.isFinite(discriminant) || discriminant < 0) {
    return 0;
  }

  const root = Math.sqrt(discriminant);
  const firstSolution = (-b - root) / (2 * a);
  const secondSolution = (-b + root) / (2 * a);
  const validSolutions = [firstSolution, secondSolution]
    .filter((solution) => Number.isFinite(solution) && solution > 0)
    .sort((left, right) => left - right);

  return validSolutions[0] ?? 0;
}

function findNearestEnemy(
  attacker: CombatantState,
  candidates: readonly CombatantState[]
): { readonly target: CombatantState; readonly distance: number } | undefined {
  const seenIds = new Set<string>();
  let nearest:
    | { readonly target: CombatantState; readonly distance: number }
    | undefined;

  for (const candidate of candidates) {
    assertCombatant(candidate, 'Combat target');

    if (seenIds.has(candidate.id)) {
      throw new TypeError(`Duplicate combat target ID: ${candidate.id}.`);
    }

    seenIds.add(candidate.id);

    if (
      candidate.id === attacker.id ||
      candidate.ownerId === attacker.ownerId ||
      candidate.hitPoints === 0
    ) {
      continue;
    }

    const distance = Math.hypot(
      candidate.position.x - attacker.position.x,
      candidate.position.y - attacker.position.y
    );

    if (!Number.isFinite(distance)) {
      throw new RangeError(
        `Combat target distance overflow for ${candidate.id}.`
      );
    }

    if (
      nearest === undefined ||
      distance < nearest.distance ||
      (distance === nearest.distance &&
        candidate.id.localeCompare(nearest.target.id) < 0)
    ) {
      nearest = { target: candidate, distance };
    }
  }

  return nearest;
}

export class NpcCombatController {
  private cooldownRemainingSeconds = 0;

  get cooldownRemaining(): number {
    return this.cooldownRemainingSeconds;
  }

  update(
    attacker: CombatantState,
    candidates: readonly CombatantState[],
    weapon: CombatWeaponPolicy,
    deltaTimeSeconds: number,
    nextProjectileId: number
  ): NpcCombatDecision {
    assertCombatant(attacker, 'Combat attacker');
    assertWeaponPolicy(weapon);

    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
      throw new RangeError('Combat AI delta time must be finite and non-negative.');
    }

    if (!Number.isSafeInteger(nextProjectileId) || nextProjectileId <= 0) {
      throw new RangeError('Next projectile ID must be a positive safe integer.');
    }

    const nextCooldownRemainingSeconds = Math.max(
      0,
      this.cooldownRemainingSeconds - deltaTimeSeconds
    );

    if (attacker.hitPoints === 0) {
      this.cooldownRemainingSeconds = nextCooldownRemainingSeconds;
      return {
        status: 'inactive',
        targetId: null,
        desiredHeadingRadians: attacker.rotation,
        cooldownRemainingSeconds: this.cooldownRemainingSeconds
      };
    }

    const nearest = findNearestEnemy(attacker, candidates);

    if (nearest === undefined) {
      this.cooldownRemainingSeconds = nextCooldownRemainingSeconds;
      return {
        status: 'no-target',
        targetId: null,
        desiredHeadingRadians: attacker.rotation,
        cooldownRemainingSeconds: this.cooldownRemainingSeconds
      };
    }

    if (nearest.distance > weapon.maximumRange) {
      this.cooldownRemainingSeconds = nextCooldownRemainingSeconds;
      return {
        status: 'out-of-range',
        targetId: nearest.target.id,
        desiredHeadingRadians: attacker.rotation,
        cooldownRemainingSeconds: this.cooldownRemainingSeconds
      };
    }

    const relativePosition = {
      x: nearest.target.position.x - attacker.position.x,
      y: nearest.target.position.y - attacker.position.y
    };
    const relativeVelocity = {
      x: nearest.target.velocity.x - attacker.velocity.x,
      y: nearest.target.velocity.y - attacker.velocity.y
    };
    const interceptSeconds = estimateInterceptSeconds(
      relativePosition,
      relativeVelocity,
      weapon.profile.speed
    );
    const aimPosition = {
      x:
        nearest.target.position.x +
        nearest.target.velocity.x * interceptSeconds,
      y:
        nearest.target.position.y +
        nearest.target.velocity.y * interceptSeconds
    };
    const aimDirection = {
      x: aimPosition.x - attacker.position.x,
      y: aimPosition.y - attacker.position.y
    };
    const aimDistance = Math.hypot(aimDirection.x, aimDirection.y);

    if (!Number.isFinite(aimDistance)) {
      throw new RangeError('Combat intercept position overflow.');
    }

    if (aimDistance > weapon.maximumRange) {
      this.cooldownRemainingSeconds = nextCooldownRemainingSeconds;
      return {
        status: 'out-of-range',
        targetId: nearest.target.id,
        desiredHeadingRadians: attacker.rotation,
        cooldownRemainingSeconds: this.cooldownRemainingSeconds
      };
    }

    if (aimDistance === 0) {
      aimDirection.x = Math.cos(attacker.rotation);
      aimDirection.y = Math.sin(attacker.rotation);
    }

    const desiredHeadingRadians = Math.atan2(
      aimDirection.y,
      aimDirection.x
    );
    const aimError = Math.abs(
      normalizeAngle(desiredHeadingRadians - attacker.rotation)
    );

    if (nextCooldownRemainingSeconds > 0) {
      this.cooldownRemainingSeconds = nextCooldownRemainingSeconds;
      return {
        status: 'cooldown',
        targetId: nearest.target.id,
        desiredHeadingRadians,
        cooldownRemainingSeconds: this.cooldownRemainingSeconds
      };
    }

    if (aimError > weapon.aimToleranceRadians) {
      this.cooldownRemainingSeconds = nextCooldownRemainingSeconds;
      return {
        status: 'aiming',
        targetId: nearest.target.id,
        desiredHeadingRadians,
        cooldownRemainingSeconds: this.cooldownRemainingSeconds
      };
    }

    const projectile = createProjectile({
      id: nextProjectileId,
      ownerId: attacker.id,
      position: attacker.position,
      direction: aimDirection,
      shooterVelocity: attacker.velocity,
      profile: weapon.profile
    });
    this.cooldownRemainingSeconds = weapon.cooldownSeconds;

    return {
      status: 'fired',
      targetId: nearest.target.id,
      desiredHeadingRadians,
      cooldownRemainingSeconds: this.cooldownRemainingSeconds,
      projectile
    };
  }
}
