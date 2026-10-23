import type { TileBounds } from '../construction/construction';
import {
  findProjectileCollisionCandidates
} from '../combat/broadphase';
import type { BroadphaseTarget } from '../combat/broadphase';
import { applyLocalDamage } from '../combat/damage';
import { findProjectileImpacts } from '../combat/narrowphase';
import {
  advanceProjectiles,
  createProjectile
} from '../combat/projectiles';
import type { Vector2 } from '../physics/rigidBody';
import { activateChunkForEvent } from '../world/chunkActivity';
import { chunkPositionForTile } from '../core/coordinates';
import type { TilePosition } from '../core/coordinates';
import type { Asteroid } from './asteroid';
import type { LocalDamageResult } from '../combat/damage';
import { createAsteroidResourceDrop } from './resourceLoot';
import type { AsteroidResourceDrop } from './resourceLoot';

export interface MiningLaserProfile {
  readonly range: number;
  readonly damagePerSecond: number;
  readonly powerDemand: number;
}

export interface MiningLaserCommand {
  readonly projectileId: number;
  readonly ownerId: string;
  readonly origin: Vector2;
  readonly direction: Vector2;
  readonly deltaTimeSeconds: number;
  readonly allocatedPower: number;
}

export type MiningLaserResult =
  | {
      readonly status: 'unpowered';
      readonly requiredPower: number;
      readonly allocatedPower: number;
    }
  | {
      readonly status: 'miss';
      readonly requiredPower: number;
      readonly allocatedPower: number;
    }
  | {
      readonly status: 'hit';
      readonly requiredPower: number;
      readonly allocatedPower: number;
      readonly tilePosition: TilePosition;
      readonly worldPosition: Vector2;
      readonly damage: LocalDamageResult;
      readonly resourceDrop: AsteroidResourceDrop | undefined;
    };

function assertValidProfile(profile: MiningLaserProfile): void {
  const values = [
    profile.range,
    profile.damagePerSecond,
    profile.powerDemand
  ];

  if (!values.every(Number.isFinite)) {
    throw new RangeError('Mining laser profile values must be finite.');
  }

  if (values.some((value) => value <= 0)) {
    throw new RangeError('Mining laser profile values must be positive.');
  }
}

function assertValidCommand(command: MiningLaserCommand): void {
  if (!Number.isSafeInteger(command.projectileId) || command.projectileId <= 0) {
    throw new RangeError('Projectile ID must be a positive safe integer.');
  }

  if (command.ownerId.trim().length === 0) {
    throw new TypeError('Mining laser owner ID must not be empty.');
  }

  const values = [
    command.origin.x,
    command.origin.y,
    command.direction.x,
    command.direction.y,
    command.deltaTimeSeconds,
    command.allocatedPower
  ];

  if (!values.every(Number.isFinite)) {
    throw new RangeError('Mining laser command values must be finite.');
  }

  if (
    command.deltaTimeSeconds <= 0 ||
    command.allocatedPower < 0
  ) {
    throw new RangeError(
      'Mining laser time must be positive and allocated power non-negative.'
    );
  }

  if (Math.hypot(command.direction.x, command.direction.y) === 0) {
    throw new RangeError('Mining laser direction must be non-zero.');
  }
}

function rotateToAsteroidLocal(
  vector: Vector2,
  asteroid: Asteroid
): Vector2 {
  const cosine = Math.cos(asteroid.state.rotation);
  const sine = Math.sin(asteroid.state.rotation);

  return {
    x: vector.x * cosine + vector.y * sine,
    y: -vector.x * sine + vector.y * cosine
  };
}

function rotateToWorld(
  position: Vector2,
  asteroid: Asteroid
): Vector2 {
  const cosine = Math.cos(asteroid.state.rotation);
  const sine = Math.sin(asteroid.state.rotation);

  return {
    x:
      asteroid.state.position.x +
      position.x * cosine -
      position.y * sine,
    y:
      asteroid.state.position.y +
      position.x * sine +
      position.y * cosine
  };
}

function tileQueryBounds(start: Vector2, end: Vector2): TileBounds {
  return {
    minX: Math.floor(Math.min(start.x, end.x)) - 1,
    minY: Math.floor(Math.min(start.y, end.y)) - 1,
    maxXExclusive: Math.ceil(Math.max(start.x, end.x)) + 1,
    maxYExclusive: Math.ceil(Math.max(start.y, end.y)) + 1
  };
}

export function fireMiningLaser(
  asteroid: Asteroid,
  profile: MiningLaserProfile,
  command: MiningLaserCommand
): MiningLaserResult {
  assertValidProfile(profile);
  assertValidCommand(command);

  const requiredPower = profile.powerDemand;

  if (command.allocatedPower === 0) {
    return {
      status: 'unpowered',
      requiredPower,
      allocatedPower: command.allocatedPower
    };
  }

  const powerRatio = Math.min(
    1,
    command.allocatedPower / profile.powerDemand
  );
  const damage = profile.damagePerSecond * command.deltaTimeSeconds * powerRatio;
  const relativeOrigin = {
    x: command.origin.x - asteroid.state.position.x,
    y: command.origin.y - asteroid.state.position.y
  };
  const localOrigin = rotateToAsteroidLocal(relativeOrigin, asteroid);
  const localDirection = rotateToAsteroidLocal(
    command.direction,
    asteroid
  );
  const directionLength = Math.hypot(localDirection.x, localDirection.y);

  if (
    !Number.isFinite(directionLength) ||
    directionLength === 0 ||
    !Number.isFinite(damage) ||
    damage <= 0
  ) {
    throw new RangeError('Mining laser trajectory or damage is invalid.');
  }

  const normalizedDirection = {
    x: localDirection.x / directionLength,
    y: localDirection.y / directionLength
  };
  const localEnd = {
    x: localOrigin.x + normalizedDirection.x * profile.range,
    y: localOrigin.y + normalizedDirection.y * profile.range
  };
  const beam = createProjectile({
    id: command.projectileId,
    ownerId: command.ownerId,
    position: localOrigin,
    direction: normalizedDirection,
    shooterVelocity: { x: 0, y: 0 },
    profile: {
      kind: 'laser',
      speed: profile.range / command.deltaTimeSeconds,
      damage,
      collisionRadius: 0,
      lifetimeSeconds: command.deltaTimeSeconds
    }
  });
  const beamEndpoint = advanceProjectiles(
    [beam],
    command.deltaTimeSeconds
  ).expired[0];

  if (beamEndpoint === undefined) {
    throw new Error('Mining laser beam did not reach its range endpoint.');
  }

  const targetPositions = new Map<string, TilePosition>();
  const targets: BroadphaseTarget[] = asteroid.construction
    .getTilesInBounds(tileQueryBounds(localOrigin, localEnd))
    .map(({ position, tile }) => {
      const id = `${asteroid.id}:tile:${tile.id}`;
      targetPositions.set(id, position);

      return {
        id,
        ownerId: asteroid.id,
        bounds: {
          minX: position.x,
          minY: position.y,
          maxX: position.x + 1,
          maxY: position.y + 1
        }
      };
    });
  const candidates = findProjectileCollisionCandidates(
    [beamEndpoint],
    targets
  );
  const impact = findProjectileImpacts(candidates)[0];

  if (impact === undefined) {
    return {
      status: 'miss',
      requiredPower,
      allocatedPower: command.allocatedPower
    };
  }

  const tilePosition = targetPositions.get(impact.target.id);

  if (tilePosition === undefined) {
    throw new Error(
      `Mining laser target position is missing: ${impact.target.id}.`
    );
  }

  const damageResult = applyLocalDamage(
    asteroid.construction,
    tilePosition,
    impact.projectile.damage
  );
  const resourceDrop = createAsteroidResourceDrop(asteroid, damageResult);

  if (
    damageResult.status !== 'miss' &&
    asteroid.construction.getChunkState(
      chunkPositionForTile(tilePosition)
    ) !== undefined
  ) {
    activateChunkForEvent(
      asteroid.construction,
      chunkPositionForTile(tilePosition),
      'nearby'
    );
  }

  return {
    status: 'hit',
    requiredPower,
    allocatedPower: command.allocatedPower,
    tilePosition,
    worldPosition: rotateToWorld(impact.position, asteroid),
    damage: damageResult,
    resourceDrop
  };
}
