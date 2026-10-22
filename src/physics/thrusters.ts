import {
  chunkKey,
  chunkPositionForTile
} from '../core/coordinates';
import type { ChunkPosition, TilePosition } from '../core/coordinates';
import { isTileOrientation } from '../core/tiles';
import type { Construction } from '../construction/construction';
import type { TileOrientation } from '../core/tiles';
import { allocateChunkPower } from '../energy/powerAllocation';
import type { PowerDemand } from '../energy/powerAllocation';
import { integrateRigidBody } from './rigidBody';
import type { RigidBodyState } from './rigidBody';
import type { RigidBodyProperties } from './rigidBodyProperties';

export interface ThrusterCommand {
  readonly tileId: number;
  readonly throttle: number;
}

export interface ForceVector {
  readonly x: number;
  readonly y: number;
}

export interface ThrusterPlacement {
  readonly tileId: number;
  readonly position: TilePosition;
  readonly chunkPosition: ChunkPosition;
  readonly orientation: TileOrientation;
  readonly thrustForce: number;
  readonly powerConsumption: number;
}

export interface ChunkThrusterForce {
  readonly position: ChunkPosition;
  readonly force: ForceVector;
  readonly torque: number;
  readonly requestedPower: number;
  readonly allocatedPower: number;
  readonly unusedPower: number;
  readonly activeThrusterCount: number;
}

export interface ThrusterForceReport {
  readonly force: ForceVector;
  readonly torque: number;
  readonly requestedPower: number;
  readonly allocatedPower: number;
  readonly unusedPower: number;
  readonly activeThrusterCount: number;
  readonly chunks: readonly ChunkThrusterForce[];
}

export interface ThrusterStepReport {
  readonly state: RigidBodyState;
  readonly thrusterForces: ThrusterForceReport;
}

interface ActiveThruster {
  readonly placement: ThrusterPlacement;
  readonly throttle: number;
  readonly requestedPower: number;
}

interface MutableChunkThrusterGroup {
  readonly position: ChunkPosition;
  readonly thrusters: ActiveThruster[];
}

interface MutableChunkThrusterForce {
  readonly position: ChunkPosition;
  forceX: number;
  forceY: number;
  torque: number;
  requestedPower: number;
  allocatedPower: number;
  unusedPower: number;
  activeThrusterCount: number;
}

const THRUSTER_DIRECTIONS: Record<TileOrientation, ForceVector> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 }
};

function compareChunkPositions(
  left: ChunkPosition,
  right: ChunkPosition
): number {
  return left.y - right.y || left.x - right.x;
}

function emptyThrusterForceReport(): ThrusterForceReport {
  return {
    force: { x: 0, y: 0 },
    torque: 0,
    requestedPower: 0,
    allocatedPower: 0,
    unusedPower: 0,
    activeThrusterCount: 0,
    chunks: []
  };
}

export function buildThrusterLayout(
  construction: Construction
): readonly ThrusterPlacement[] {
  const thrusters: ThrusterPlacement[] = [];

  for (const { position, tile } of construction.iterateTiles()) {
    if (tile.type !== 'thruster' || tile.hp === 0) {
      continue;
    }

    if (!Number.isFinite(tile.hp) || tile.hp < 0) {
      throw new RangeError(`Invalid HP for thruster tile ${tile.id}.`);
    }

    if (!isTileOrientation(tile.orientation)) {
      throw new TypeError(`Invalid orientation for thruster ${tile.id}.`);
    }

    const definition = construction.tileRegistry.get(tile.type);

    if (definition === undefined) {
      throw new TypeError(`Tile type is not registered: ${tile.type}.`);
    }

    const chunkPosition = chunkPositionForTile(position);

    thrusters.push({
      tileId: tile.id,
      position,
      chunkPosition,
      orientation: tile.orientation,
      thrustForce: definition.thrustForce,
      powerConsumption: definition.powerConsumption
    });
  }

  return thrusters.sort((left, right) => left.tileId - right.tileId);
}

/**
 * Available chunk power must contain the budget remaining after higher-priority consumers.
 */
export function calculateThrusterForces(
  layout: readonly ThrusterPlacement[],
  centerOfMass: RigidBodyProperties['centerOfMass'],
  commands: readonly ThrusterCommand[],
  availablePowerByChunk: ReadonlyMap<string, number>
): ThrusterForceReport {
  const placementsById = new Map<number, ThrusterPlacement>();

  for (const placement of layout) {
    if (placementsById.has(placement.tileId)) {
      throw new TypeError(`Duplicate thruster layout tile ID: ${placement.tileId}.`);
    }

    placementsById.set(placement.tileId, placement);
  }

  const commandsByTileId = new Map<number, ThrusterCommand>();

  for (const command of commands) {
    if (!Number.isSafeInteger(command.tileId) || command.tileId <= 0) {
      throw new RangeError('Thruster tile ID must be a positive safe integer.');
    }

    if (
      !Number.isFinite(command.throttle) ||
      command.throttle < 0 ||
      command.throttle > 1
    ) {
      throw new RangeError(
        `Throttle for tile ${command.tileId} must be between 0 and 1.`
      );
    }

    if (commandsByTileId.has(command.tileId)) {
      throw new TypeError(`Duplicate thruster command: ${command.tileId}.`);
    }

    if (!placementsById.has(command.tileId)) {
      throw new RangeError(`Thruster tile not found in layout: ${command.tileId}.`);
    }

    commandsByTileId.set(command.tileId, command);
  }

  if (commandsByTileId.size === 0) {
    return emptyThrusterForceReport();
  }

  if (centerOfMass === null) {
    throw new RangeError('Thruster force requires a positive-mass construction.');
  }

  const thrustersByChunk = new Map<string, MutableChunkThrusterGroup>();

  for (const command of commandsByTileId.values()) {
    if (command.throttle === 0) {
      continue;
    }

    const placement = placementsById.get(command.tileId);

    if (placement === undefined) {
      throw new Error(`Missing thruster placement: ${command.tileId}.`);
    }

    const requestedPower =
      placement.powerConsumption * command.throttle;

    if (!Number.isFinite(requestedPower)) {
      throw new RangeError(`Power demand overflow for thruster ${command.tileId}.`);
    }

    const key = chunkKey(placement.chunkPosition);
    const group = thrustersByChunk.get(key) ?? {
      position: placement.chunkPosition,
      thrusters: []
    };

    group.thrusters.push({ placement, throttle: command.throttle, requestedPower });
    thrustersByChunk.set(key, group);
  }

  if (thrustersByChunk.size === 0) {
    return emptyThrusterForceReport();
  }

  const chunkResults: MutableChunkThrusterForce[] = [];

  for (const [key, group] of thrustersByChunk) {
    const availablePower = availablePowerByChunk.get(key);

    if (availablePower === undefined) {
      throw new RangeError(`Missing power budget for chunk ${key}.`);
    }

    if (!Number.isFinite(availablePower) || availablePower < 0) {
      throw new RangeError(`Invalid power budget for chunk ${key}.`);
    }

    const demands: PowerDemand[] = group.thrusters.map((thruster) => ({
      consumerId: String(thruster.placement.tileId),
      priority: 'propulsion',
      requestedPower: thruster.requestedPower
    }));
    const allocation = allocateChunkPower(availablePower, demands);
    const allocatedById = new Map(
      allocation.allocations.map((entry) => [
        Number(entry.consumerId),
        entry.allocatedPower
      ])
    );
    const result: MutableChunkThrusterForce = {
      position: group.position,
      forceX: 0,
      forceY: 0,
      torque: 0,
      requestedPower: allocation.requestedPower,
      allocatedPower: allocation.allocatedPower,
      unusedPower: allocation.unusedPower,
      activeThrusterCount: 0
    };

    for (const thruster of group.thrusters) {
      const allocatedPower = allocatedById.get(thruster.placement.tileId);

      if (allocatedPower === undefined) {
        throw new Error(
          `Missing power allocation for thruster ${thruster.placement.tileId}.`
        );
      }

      const powerRatio =
        thruster.requestedPower === 0
          ? 1
          : allocatedPower / thruster.requestedPower;
      const appliedThrust =
        thruster.placement.thrustForce * thruster.throttle * powerRatio;
      const direction =
        THRUSTER_DIRECTIONS[thruster.placement.orientation];
      const forceX = direction.x * appliedThrust;
      const forceY = direction.y * appliedThrust;
      const dx = thruster.placement.position.x + 0.5 - centerOfMass.x;
      const dy = thruster.placement.position.y + 0.5 - centerOfMass.y;

      result.forceX += forceX;
      result.forceY += forceY;
      result.torque += dx * forceY - dy * forceX;

      if (appliedThrust > 0) {
        result.activeThrusterCount += 1;
      }
    }

    if (
      !Number.isFinite(result.forceX) ||
      !Number.isFinite(result.forceY) ||
      !Number.isFinite(result.torque)
    ) {
      throw new RangeError(`Thruster force overflow in chunk ${key}.`);
    }

    chunkResults.push(result);
  }

  chunkResults.sort((left, right) =>
    compareChunkPositions(left.position, right.position)
  );

  const force = {
    x: chunkResults.reduce((total, chunk) => total + chunk.forceX, 0),
    y: chunkResults.reduce((total, chunk) => total + chunk.forceY, 0)
  };
  const torque = chunkResults.reduce(
    (total, chunk) => total + chunk.torque,
    0
  );

  if (
    !Number.isFinite(force.x) ||
    !Number.isFinite(force.y) ||
    !Number.isFinite(torque)
  ) {
    throw new RangeError('Total thruster force overflow.');
  }

  return {
    force,
    torque,
    requestedPower: chunkResults.reduce(
      (total, chunk) => total + chunk.requestedPower,
      0
    ),
    allocatedPower: chunkResults.reduce(
      (total, chunk) => total + chunk.allocatedPower,
      0
    ),
    unusedPower: chunkResults.reduce(
      (total, chunk) => total + chunk.unusedPower,
      0
    ),
    activeThrusterCount: chunkResults.reduce(
      (total, chunk) => total + chunk.activeThrusterCount,
      0
    ),
    chunks: chunkResults.map((chunk) => ({
      position: chunk.position,
      force: { x: chunk.forceX, y: chunk.forceY },
      torque: chunk.torque,
      requestedPower: chunk.requestedPower,
      allocatedPower: chunk.allocatedPower,
      unusedPower: chunk.unusedPower,
      activeThrusterCount: chunk.activeThrusterCount
    }))
  };
}

/**
 * Reuse the layout, rigid-body properties, and chunk budgets until the construction changes.
 */
export function simulateThrusterStep(
  state: RigidBodyState,
  properties: RigidBodyProperties,
  layout: readonly ThrusterPlacement[],
  commands: readonly ThrusterCommand[],
  availablePowerByChunk: ReadonlyMap<string, number>,
  deltaTimeSeconds: number
): ThrusterStepReport {
  const thrusterForces = calculateThrusterForces(
    layout,
    properties.centerOfMass,
    commands,
    availablePowerByChunk
  );
  const nextState = integrateRigidBody(
    state,
    thrusterForces.force,
    thrusterForces.torque,
    properties.mass,
    properties.momentOfInertia,
    deltaTimeSeconds
  );

  return {
    state: nextState,
    thrusterForces
  };
}
