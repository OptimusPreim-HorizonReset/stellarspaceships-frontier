import { findProjectileCollisionCandidates } from '../combat/broadphase';
import type { BroadphaseTarget } from '../combat/broadphase';
import { applyProjectileImpactDamage } from '../combat/damage';
import type { LocalDamageResult } from '../combat/damage';
import { findProjectileImpacts } from '../combat/narrowphase';
import {
  advanceProjectiles,
  createProjectile
} from '../combat/projectiles';
import { chunkKey, chunkPositionForTile } from '../core/coordinates';
import type { TilePosition } from '../core/coordinates';
import { isResourceType } from '../core/tiles';
import type { TileOrientation } from '../core/tiles';
import { DEFAULT_TILE_REGISTRY, isTileOrientation } from '../core/tiles';
import type { PowerPriority } from '../core/power';
import { Construction } from '../construction/construction';
import { calculateAvailablePowerByChunk } from '../energy/powerBudget';
import { allocateChunkPower } from '../energy/powerAllocation';
import { calculateRigidBodyProperties } from '../physics/rigidBodyProperties';
import type { RigidBodyState, Vector2 } from '../physics/rigidBody';
import {
  buildThrusterLayout,
  simulateThrusterStep
} from '../physics/thrusters';
import type { ThrusterStepReport } from '../physics/thrusters';
import {
  deserializeConstruction,
  serializeConstruction
} from '../save/serialization';
import { Asteroid } from '../mining/asteroid';
import type { AsteroidDefinition, AsteroidTileDefinition } from '../mining/asteroid';
import { fireMiningLaser } from '../mining/miningLaser';
import type { MiningLaserResult } from '../mining/miningLaser';
import {
  parseAsteroidResourceDrop,
  ResourceInventory
} from '../mining/resourceLoot';
import type {
  AsteroidResourceDrop,
  ResourceCollectionResult
} from '../mining/resourceLoot';

export const GATE_C_SESSION_SAVE_VERSION = 1;

export type CannonActionResult =
  | {
      readonly status: 'unpowered';
      readonly requestedPower: number;
      readonly allocatedPower: number;
    }
  | {
      readonly status: 'miss';
      readonly requestedPower: number;
      readonly allocatedPower: number;
    }
  | {
      readonly status: 'hit';
      readonly requestedPower: number;
      readonly allocatedPower: number;
      readonly tilePosition: TilePosition;
      readonly damage: LocalDamageResult;
    };

interface ConstructionTargetSet {
  readonly targets: readonly BroadphaseTarget[];
  readonly positionsById: ReadonlyMap<string, TilePosition>;
}

interface ParsedGateCSession {
  readonly playerConstruction: Construction;
  readonly playerState: RigidBodyState;
  readonly enemyConstruction: Construction;
  readonly enemyState: RigidBodyState;
  readonly asteroid: Asteroid;
  readonly inventory: ResourceInventory;
  readonly pendingResourceDrops: readonly AsteroidResourceDrop[];
  readonly nextProjectileId: number;
}

const CANNON_POWER_DEMAND = 40;
const CANNON_DAMAGE = 40;
const CANNON_SPEED = 40;
const CANNON_LIFETIME_SECONDS = 1;
const MINING_LASER_PROFILE = {
  range: 30,
  damagePerSecond: 120,
  powerDemand: 25
} as const;

function initialRigidBodyState(): RigidBodyState {
  return {
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    angularVelocity: 0
  };
}

function createEnemyConstruction(): Construction {
  const construction = new Construction('gate-c-raider');
  construction.placeTile({ x: 0, y: 0 }, 'hull');
  construction.placeTile({ x: 1, y: 0 }, 'armor');
  construction.placeTile({ x: 0, y: 1 }, 'hull');
  construction.placeTile({ x: 1, y: 1 }, 'reactor');
  return construction;
}

function createMissionAsteroid(): Asteroid {
  return new Asteroid({
    id: 'gate-c-asteroid',
    state: {
      position: { x: 12, y: 0 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      angularVelocity: 0
    },
    tiles: [
      {
        position: { x: 0, y: 0 },
        resourceType: 'ore',
        resourceAmount: 3
      },
      {
        position: { x: 1, y: 0 },
        resourceType: 'ice',
        resourceAmount: 2
      }
    ]
  });
}

function transformPoint(
  localPosition: Vector2,
  state: RigidBodyState
): Vector2 {
  const cosine = Math.cos(state.rotation);
  const sine = Math.sin(state.rotation);

  return {
    x:
      state.position.x +
      localPosition.x * cosine -
      localPosition.y * sine,
    y:
      state.position.y +
      localPosition.x * sine +
      localPosition.y * cosine
  };
}

function getConstructionTargets(
  construction: Construction,
  state: RigidBodyState
): ConstructionTargetSet {
  const properties = calculateRigidBodyProperties(construction);

  if (properties.centerOfMass === null) {
    return { targets: [], positionsById: new Map() };
  }

  const centerOfMass = properties.centerOfMass;
  const targets: BroadphaseTarget[] = [];
  const positionsById = new Map<string, TilePosition>();

  for (const { position, tile } of construction.getTiles()) {
    if (tile.hp === 0) {
      continue;
    }

    const localCorners = [
      { x: position.x, y: position.y },
      { x: position.x + 1, y: position.y },
      { x: position.x, y: position.y + 1 },
      { x: position.x + 1, y: position.y + 1 }
    ];
    const worldCorners = localCorners.map((corner) =>
      transformPoint(
        {
          x: corner.x - centerOfMass.x,
          y: corner.y - centerOfMass.y
        },
        state
      )
    );
    const targetId = `${construction.id}:tile:${tile.id}`;

    targets.push({
      id: targetId,
      ownerId: construction.id,
      bounds: {
        minX: Math.min(...worldCorners.map((corner) => corner.x)),
        minY: Math.min(...worldCorners.map((corner) => corner.y)),
        maxX: Math.max(...worldCorners.map((corner) => corner.x)),
        maxY: Math.max(...worldCorners.map((corner) => corner.y))
      }
    });
    positionsById.set(targetId, position);
  }

  return { targets, positionsById };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }

  return value;
}

function requireFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }

  return value;
}

function requireSafeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be a safe integer.`);
  }

  return value;
}

function parseVector2(value: unknown, label: string): Vector2 {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be a JSON object.`);
  }

  return {
    x: requireFiniteNumber(value.x, `${label} x`),
    y: requireFiniteNumber(value.y, `${label} y`)
  };
}

function parseRigidBodyState(value: unknown, label: string): RigidBodyState {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be a JSON object.`);
  }

  return {
    position: parseVector2(value.position, `${label} position`),
    velocity: parseVector2(value.velocity, `${label} velocity`),
    rotation: requireFiniteNumber(value.rotation, `${label} rotation`),
    angularVelocity: requireFiniteNumber(
      value.angularVelocity,
      `${label} angular velocity`
    )
  };
}

function parseAsteroidTileDefinition(value: unknown): AsteroidTileDefinition {
  if (!isRecord(value) || !isRecord(value.position)) {
    throw new TypeError('Asteroid tile definition must contain a position.');
  }

  const resourceType = requireString(value.resourceType, 'Resource type');

  if (!isResourceType(resourceType)) {
    throw new TypeError(`Unknown resource type: ${resourceType}.`);
  }

  const definition: AsteroidTileDefinition = {
    position: {
      x: requireSafeInteger(value.position.x, 'Asteroid tile x'),
      y: requireSafeInteger(value.position.y, 'Asteroid tile y')
    },
    resourceType,
    resourceAmount: requireFiniteNumber(
      value.resourceAmount,
      'Asteroid resource amount'
    )
  };

  if (value.hitPoints === undefined) {
    return definition;
  }

  return {
    ...definition,
    hitPoints: requireFiniteNumber(value.hitPoints, 'Asteroid tile hit points')
  };
}

function parseAsteroidDefinition(value: unknown): AsteroidDefinition {
  if (!isRecord(value) || !Array.isArray(value.tiles)) {
    throw new TypeError('Asteroid save must contain a tiles array.');
  }

  return {
    id: requireString(value.id, 'Asteroid ID'),
    state: parseRigidBodyState(value.state, 'Asteroid state'),
    tiles: value.tiles.map(parseAsteroidTileDefinition)
  };
}

function parseGateCSession(serialized: string): ParsedGateCSession {
  const value: unknown = JSON.parse(serialized);

  if (!isRecord(value)) {
    throw new TypeError('Gate C session save must be a JSON object.');
  }

  const version = requireSafeInteger(value.version, 'Gate C save version');

  if (version !== GATE_C_SESSION_SAVE_VERSION) {
    throw new RangeError(`Unsupported Gate C save version: ${version}.`);
  }

  if (!Array.isArray(value.pendingResourceDrops)) {
    throw new TypeError('Pending resource drops must be an array.');
  }

  const nextProjectileId = requireSafeInteger(
    value.nextProjectileId,
    'Next projectile ID'
  );

  if (nextProjectileId <= 0) {
    throw new RangeError('Next projectile ID must be positive.');
  }

  return {
    playerConstruction: deserializeConstruction(
      requireString(value.playerConstruction, 'Player construction save'),
      DEFAULT_TILE_REGISTRY
    ),
    playerState: parseRigidBodyState(value.playerState, 'Player state'),
    enemyConstruction: deserializeConstruction(
      requireString(value.enemyConstruction, 'Enemy construction save'),
      DEFAULT_TILE_REGISTRY
    ),
    enemyState: parseRigidBodyState(value.enemyState, 'Enemy state'),
    asteroid: new Asteroid(parseAsteroidDefinition(value.asteroid)),
    inventory: ResourceInventory.fromSnapshot(value.inventory),
    pendingResourceDrops: value.pendingResourceDrops.map(
      parseAsteroidResourceDrop
    ),
    nextProjectileId
  };
}

export class GateCSession {
  private currentPlayerConstruction: Construction;
  private currentPlayerState: RigidBodyState = initialRigidBodyState();
  private currentEnemyConstruction = createEnemyConstruction();
  private currentEnemyState: RigidBodyState = {
    position: { x: 20, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    angularVelocity: 0
  };
  private currentAsteroid = createMissionAsteroid();
  private currentInventory = new ResourceInventory();
  private pendingResourceDrops: AsteroidResourceDrop[] = [];
  private nextProjectileId = 1;

  constructor(playerConstruction: Construction) {
    this.currentPlayerConstruction = playerConstruction;
  }

  get playerConstruction(): Construction {
    return this.currentPlayerConstruction;
  }

  get playerState(): RigidBodyState {
    return this.currentPlayerState;
  }

  get enemyConstruction(): Construction {
    return this.currentEnemyConstruction;
  }

  get asteroid(): Asteroid {
    return this.currentAsteroid;
  }

  get inventory(): ResourceInventory {
    return this.currentInventory;
  }

  get pendingResourceDropCount(): number {
    return this.pendingResourceDrops.length;
  }

  get enemyHitPoints(): number {
    return this.currentEnemyConstruction
      .getTiles()
      .reduce((total, { tile }) => total + tile.hp, 0);
  }

  setPlayerConstruction(construction: Construction): void {
    this.currentPlayerConstruction = construction;
  }

  stepFlight(
    direction: TileOrientation,
    deltaTimeSeconds = 1
  ): ThrusterStepReport {
    if (!isTileOrientation(direction)) {
      throw new TypeError(`Invalid flight direction: ${String(direction)}.`);
    }

    const properties = calculateRigidBodyProperties(
      this.currentPlayerConstruction
    );
    const layout = buildThrusterLayout(this.currentPlayerConstruction);
    const commands = layout
      .filter((thruster) => thruster.orientation === direction)
      .map((thruster) => ({ tileId: thruster.tileId, throttle: 1 }));
    const availablePower = calculateAvailablePowerByChunk(
      this.currentPlayerConstruction,
      'propulsion'
    );
    const report = simulateThrusterStep(
      this.currentPlayerState,
      properties,
      layout,
      commands,
      availablePower,
      deltaTimeSeconds
    );

    this.currentPlayerState = report.state;
    return report;
  }

  fireCannon(): CannonActionResult {
    const requestedPower = CANNON_POWER_DEMAND;
    const allocatedPower = this.allocatePower(
      'weapons',
      'gate-c-cannon',
      requestedPower
    );

    if (allocatedPower === 0) {
      return { status: 'unpowered', requestedPower, allocatedPower };
    }

    const direction = {
      x:
        this.currentEnemyState.position.x -
        this.currentPlayerState.position.x,
      y:
        this.currentEnemyState.position.y -
        this.currentPlayerState.position.y
    };

    if (Math.hypot(direction.x, direction.y) === 0) {
      return { status: 'miss', requestedPower, allocatedPower };
    }

    const projectile = createProjectile({
      id: this.takeProjectileId(),
      ownerId: this.currentPlayerConstruction.id,
      position: this.currentPlayerState.position,
      direction,
      shooterVelocity: this.currentPlayerState.velocity,
      profile: {
        kind: 'cannon',
        speed: CANNON_SPEED,
        damage: CANNON_DAMAGE * (allocatedPower / requestedPower),
        collisionRadius: 0.2,
        lifetimeSeconds: CANNON_LIFETIME_SECONDS
      }
    });
    const step = advanceProjectiles(
      [projectile],
      CANNON_LIFETIME_SECONDS
    );
    const projectileAtEnd = step.expired[0] ?? step.active[0];

    if (projectileAtEnd === undefined) {
      throw new Error('Cannon projectile did not produce a simulation state.');
    }

    const targetSet = getConstructionTargets(
      this.currentEnemyConstruction,
      this.currentEnemyState
    );
    const candidates = findProjectileCollisionCandidates(
      [projectileAtEnd],
      targetSet.targets
    );
    const impact = findProjectileImpacts(candidates)[0];

    if (impact === undefined) {
      return { status: 'miss', requestedPower, allocatedPower };
    }

    const tilePosition = targetSet.positionsById.get(impact.target.id);

    if (tilePosition === undefined) {
      throw new Error(`Cannon target position is missing: ${impact.target.id}.`);
    }

    const damage = applyProjectileImpactDamage(impact, {
      id: impact.target.id,
      construction: this.currentEnemyConstruction,
      position: tilePosition
    });

    if (damage.status === 'miss') {
      return { status: 'miss', requestedPower, allocatedPower };
    }

    return {
      status: 'hit',
      requestedPower,
      allocatedPower,
      tilePosition,
      damage
    };
  }

  fireMiningLaser(): MiningLaserResult {
    const requestedPower = MINING_LASER_PROFILE.powerDemand;
    const allocatedPower = this.allocatePower(
      'industry',
      'gate-c-mining-laser',
      requestedPower
    );
    const firstTile = this.currentAsteroid.construction.getTiles()[0];
    const targetPosition =
      firstTile === undefined
        ? this.currentAsteroid.state.position
        : transformPoint(
            {
              x: firstTile.position.x + 0.5,
              y: firstTile.position.y + 0.5
            },
            this.currentAsteroid.state
          );
    const direction = {
      x: targetPosition.x - this.currentPlayerState.position.x,
      y: targetPosition.y - this.currentPlayerState.position.y
    };
    const normalizedDirection =
      Math.hypot(direction.x, direction.y) === 0
        ? {
            x: Math.cos(this.currentPlayerState.rotation),
            y: Math.sin(this.currentPlayerState.rotation)
          }
        : direction;
    const result = fireMiningLaser(
      this.currentAsteroid,
      MINING_LASER_PROFILE,
      {
        projectileId: this.takeProjectileId(),
        ownerId: this.currentPlayerConstruction.id,
        origin: this.currentPlayerState.position,
        direction: normalizedDirection,
        deltaTimeSeconds: 1,
        allocatedPower
      }
    );

    if (result.status === 'hit' && result.resourceDrop !== undefined) {
      this.pendingResourceDrops.push(result.resourceDrop);
    }

    return result;
  }

  collectResources(): readonly ResourceCollectionResult[] {
    const drops = this.pendingResourceDrops.splice(0);
    return drops.map((drop) => this.currentInventory.collect(drop));
  }

  resetMission(): void {
    this.currentPlayerState = initialRigidBodyState();
    this.currentEnemyConstruction = createEnemyConstruction();
    this.currentEnemyState = {
      position: { x: 20, y: 0 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      angularVelocity: 0
    };
    this.currentAsteroid = createMissionAsteroid();
    this.currentInventory = new ResourceInventory();
    this.pendingResourceDrops = [];
    this.nextProjectileId = 1;
  }

  serialize(): string {
    return JSON.stringify({
      version: GATE_C_SESSION_SAVE_VERSION,
      playerConstruction: serializeConstruction(this.currentPlayerConstruction),
      playerState: this.currentPlayerState,
      enemyConstruction: serializeConstruction(this.currentEnemyConstruction),
      enemyState: this.currentEnemyState,
      asteroid: this.currentAsteroid.getDefinition(),
      inventory: this.currentInventory.getSnapshot(),
      pendingResourceDrops: this.pendingResourceDrops,
      nextProjectileId: this.nextProjectileId
    });
  }

  static deserialize(serialized: string): GateCSession {
    const parsed = parseGateCSession(serialized);
    const session = new GateCSession(parsed.playerConstruction);

    session.currentPlayerState = parsed.playerState;
    session.currentEnemyConstruction = parsed.enemyConstruction;
    session.currentEnemyState = parsed.enemyState;
    session.currentAsteroid = parsed.asteroid;
    session.currentInventory = parsed.inventory;
    session.pendingResourceDrops = [...parsed.pendingResourceDrops];
    session.nextProjectileId = parsed.nextProjectileId;

    return session;
  }

  private allocatePower(
    priority: PowerPriority,
    consumerId: string,
    requestedPower: number
  ): number {
    const properties = calculateRigidBodyProperties(
      this.currentPlayerConstruction
    );

    if (properties.centerOfMass === null) {
      return 0;
    }

    const chunkPosition = chunkPositionForTile({
      x: Math.floor(properties.centerOfMass.x),
      y: Math.floor(properties.centerOfMass.y)
    });
    const chunkBudget =
      calculateAvailablePowerByChunk(
        this.currentPlayerConstruction,
        priority
      ).get(chunkKey(chunkPosition)) ?? 0;
    const report = allocateChunkPower(chunkBudget, [
      { consumerId, priority, requestedPower }
    ]);

    return report.allocations[0]?.allocatedPower ?? 0;
  }

  private takeProjectileId(): number {
    if (!Number.isSafeInteger(this.nextProjectileId) || this.nextProjectileId <= 0) {
      throw new RangeError('No additional projectile IDs are available.');
    }

    const id = this.nextProjectileId;
    this.nextProjectileId += 1;
    return id;
  }
}
