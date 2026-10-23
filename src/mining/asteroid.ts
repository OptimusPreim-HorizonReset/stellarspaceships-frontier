import { Construction } from '../construction/construction';
import type { TilePosition } from '../core/coordinates';
import { isResourceType } from '../core/tiles';
import type { ResourceType } from '../core/tiles';
import type { RigidBodyState } from '../physics/rigidBody';

export interface AsteroidTileDefinition {
  readonly position: TilePosition;
  readonly resourceType: ResourceType;
  readonly resourceAmount: number;
  readonly hitPoints?: number;
}

export interface AsteroidDefinition {
  readonly id: string;
  readonly state: RigidBodyState;
  readonly tiles: readonly AsteroidTileDefinition[];
}

export interface AsteroidResourceDeposit {
  readonly resourceType: ResourceType;
  readonly amount: number;
}

function cloneRigidBodyState(state: RigidBodyState): RigidBodyState {
  const values = [
    state.position.x,
    state.position.y,
    state.velocity.x,
    state.velocity.y,
    state.rotation,
    state.angularVelocity
  ];

  if (!values.every(Number.isFinite)) {
    throw new RangeError('Asteroid rigid body state must be finite.');
  }

  return {
    position: { ...state.position },
    velocity: { ...state.velocity },
    rotation: state.rotation,
    angularVelocity: state.angularVelocity
  };
}

export class Asteroid {
  readonly id: string;
  readonly construction: Construction;
  private currentState: RigidBodyState;
  private readonly resourceDeposits = new Map<number, AsteroidResourceDeposit>();

  constructor(definition: AsteroidDefinition) {
    if (definition.tiles.length === 0) {
      throw new RangeError('Asteroid must contain at least one tile.');
    }

    this.id = definition.id;
    this.construction = new Construction(definition.id);
    this.currentState = cloneRigidBodyState(definition.state);

    const rockDefinition = this.construction.tileRegistry.get('rock');

    if (rockDefinition === undefined) {
      throw new RangeError('Asteroid rock tile is not registered.');
    }

    for (const tileDefinition of definition.tiles) {
      if (!isResourceType(tileDefinition.resourceType)) {
        throw new TypeError(
          `Unknown asteroid resource: ${String(tileDefinition.resourceType)}.`
        );
      }

      if (
        !Number.isFinite(tileDefinition.resourceAmount) ||
        tileDefinition.resourceAmount <= 0
      ) {
        throw new RangeError('Asteroid resource amount must be finite and positive.');
      }

      if (
        tileDefinition.hitPoints !== undefined &&
        (!Number.isFinite(tileDefinition.hitPoints) ||
          tileDefinition.hitPoints <= 0 ||
          tileDefinition.hitPoints > rockDefinition.maxHp)
      ) {
        throw new RangeError('Asteroid tile hit points are outside valid ranges.');
      }

      if (this.construction.getTile(tileDefinition.position) !== undefined) {
        throw new TypeError(
          `An asteroid tile already exists at (${tileDefinition.position.x}, ${tileDefinition.position.y}).`
        );
      }

      const tile = this.construction.placeTile(
        tileDefinition.position,
        'rock'
      );

      if (tileDefinition.hitPoints !== undefined) {
        tile.hp = tileDefinition.hitPoints;
      }

      this.resourceDeposits.set(
        tile.id,
        Object.freeze({
          resourceType: tileDefinition.resourceType,
          amount: tileDefinition.resourceAmount
        })
      );
    }
  }

  get state(): RigidBodyState {
    return this.currentState;
  }

  setRigidBodyState(state: RigidBodyState): void {
    this.currentState = cloneRigidBodyState(state);
  }

  getResourceDeposit(tileId: number): AsteroidResourceDeposit | undefined {
    return this.resourceDeposits.get(tileId);
  }

  claimResourceDeposit(tileId: number): AsteroidResourceDeposit | undefined {
    if (!Number.isSafeInteger(tileId) || tileId <= 0) {
      throw new RangeError('Asteroid tile ID must be a positive safe integer.');
    }

    const deposit = this.resourceDeposits.get(tileId);

    if (deposit !== undefined) {
      this.resourceDeposits.delete(tileId);
    }

    return deposit;
  }
}
