import type { Vector2 } from '../physics/rigidBody';

export const PROJECTILE_KINDS = ['laser', 'cannon', 'rocket'] as const;

export type ProjectileKind = (typeof PROJECTILE_KINDS)[number];

const projectileKindSet = new Set<string>(PROJECTILE_KINDS);

export interface ProjectileProfile {
  readonly kind: ProjectileKind;
  readonly speed: number;
  readonly damage: number;
  readonly collisionRadius: number;
  readonly lifetimeSeconds: number;
}

export interface Projectile {
  readonly id: number;
  readonly ownerId: string;
  readonly kind: ProjectileKind;
  readonly previousPosition: Vector2;
  readonly position: Vector2;
  readonly velocity: Vector2;
  readonly damage: number;
  readonly collisionRadius: number;
  readonly remainingLifetimeSeconds: number;
}

export interface ProjectileLaunch {
  readonly id: number;
  readonly ownerId: string;
  readonly position: Vector2;
  readonly direction: Vector2;
  readonly shooterVelocity: Vector2;
  readonly profile: ProjectileProfile;
}

export interface ProjectileAdvanceResult {
  readonly active: readonly Projectile[];
  readonly expired: readonly Projectile[];
}

export function isProjectileKind(value: unknown): value is ProjectileKind {
  return typeof value === 'string' && projectileKindSet.has(value);
}

function assertFiniteVector(vector: Vector2, label: string): void {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
    throw new RangeError(`${label} must contain finite coordinates.`);
  }
}

function assertValidIdentity(id: number, ownerId: string): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new RangeError('Projectile ID must be a positive safe integer.');
  }

  if (ownerId.trim().length === 0) {
    throw new TypeError('Projectile owner ID must not be empty.');
  }
}

function assertValidProfile(profile: ProjectileProfile): void {
  if (!isProjectileKind(profile.kind)) {
    throw new TypeError(`Unknown projectile kind: ${String(profile.kind)}.`);
  }

  const numericValues = [
    profile.speed,
    profile.damage,
    profile.collisionRadius,
    profile.lifetimeSeconds
  ];

  if (!numericValues.every(Number.isFinite)) {
    throw new RangeError('Projectile profile values must be finite.');
  }

  if (
    profile.speed <= 0 ||
    profile.damage <= 0 ||
    profile.collisionRadius < 0 ||
    profile.lifetimeSeconds <= 0
  ) {
    throw new RangeError('Projectile profile values are outside valid ranges.');
  }
}

function assertValidProjectile(projectile: Projectile): void {
  assertValidIdentity(projectile.id, projectile.ownerId);

  if (!isProjectileKind(projectile.kind)) {
    throw new TypeError(`Unknown projectile kind: ${String(projectile.kind)}.`);
  }

  assertFiniteVector(projectile.previousPosition, 'Previous projectile position');
  assertFiniteVector(projectile.position, 'Projectile position');
  assertFiniteVector(projectile.velocity, 'Projectile velocity');

  const numericValues = [
    projectile.damage,
    projectile.collisionRadius,
    projectile.remainingLifetimeSeconds
  ];

  if (!numericValues.every(Number.isFinite)) {
    throw new RangeError('Projectile state values must be finite.');
  }

  if (
    projectile.damage <= 0 ||
    projectile.collisionRadius < 0 ||
    projectile.remainingLifetimeSeconds <= 0
  ) {
    throw new RangeError('Projectile state values are outside valid ranges.');
  }
}

export function createProjectile(launch: ProjectileLaunch): Projectile {
  assertValidIdentity(launch.id, launch.ownerId);
  assertValidProfile(launch.profile);
  assertFiniteVector(launch.position, 'Projectile position');
  assertFiniteVector(launch.direction, 'Projectile direction');
  assertFiniteVector(launch.shooterVelocity, 'Shooter velocity');

  const directionLength = Math.hypot(launch.direction.x, launch.direction.y);

  if (!Number.isFinite(directionLength) || directionLength === 0) {
    throw new RangeError('Projectile direction must be non-zero and finite.');
  }

  const velocity = {
    x:
      launch.shooterVelocity.x +
      (launch.direction.x / directionLength) * launch.profile.speed,
    y:
      launch.shooterVelocity.y +
      (launch.direction.y / directionLength) * launch.profile.speed
  };

  assertFiniteVector(velocity, 'Projectile velocity');

  const position = { ...launch.position };
  const previousPosition = { ...launch.position };

  return {
    id: launch.id,
    ownerId: launch.ownerId,
    kind: launch.profile.kind,
    previousPosition,
    position,
    velocity,
    damage: launch.profile.damage,
    collisionRadius: launch.profile.collisionRadius,
    remainingLifetimeSeconds: launch.profile.lifetimeSeconds
  };
}

export function advanceProjectiles(
  projectiles: readonly Projectile[],
  deltaTimeSeconds: number
): ProjectileAdvanceResult {
  if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
    throw new RangeError('Projectile delta time must be finite and non-negative.');
  }

  const active: Projectile[] = [];
  const expired: Projectile[] = [];
  const seenIds = new Set<number>();

  for (const projectile of projectiles) {
    assertValidProjectile(projectile);

    if (seenIds.has(projectile.id)) {
      throw new TypeError(`Duplicate projectile ID: ${projectile.id}.`);
    }

    seenIds.add(projectile.id);
    const elapsedSeconds = Math.min(
      deltaTimeSeconds,
      projectile.remainingLifetimeSeconds
    );
    const remainingLifetimeSeconds = Math.max(
      0,
      projectile.remainingLifetimeSeconds - deltaTimeSeconds
    );
    const position = {
      x: projectile.position.x + projectile.velocity.x * elapsedSeconds,
      y: projectile.position.y + projectile.velocity.y * elapsedSeconds
    };

    assertFiniteVector(position, 'Advanced projectile position');

    const advancedProjectile: Projectile = {
      ...projectile,
      previousPosition: projectile.position,
      position,
      remainingLifetimeSeconds
    };

    if (remainingLifetimeSeconds === 0) {
      expired.push(advancedProjectile);
    } else {
      active.push(advancedProjectile);
    }
  }

  return { active, expired };
}
