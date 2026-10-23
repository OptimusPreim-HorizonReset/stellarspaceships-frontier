import type { Station } from './station';
import type { RigidBodyState, Vector2 } from '../physics/rigidBody';

export interface DockingPort {
  readonly id: string;
  readonly stationId: string;
  readonly localPosition: Vector2;
  readonly localRotation: number;
}

export interface DockingPolicy {
  readonly captureRadius: number;
  readonly maximumRelativeSpeed: number;
}

export interface DockingConnection {
  readonly shipId: string;
  readonly stationId: string;
  readonly portId: string;
  readonly localPosition: Vector2;
  readonly localRotation: number;
}

export type DockingAttemptResult =
  | {
      readonly status: 'docked';
      readonly connection: DockingConnection;
    }
  | {
      readonly status: 'already-docked';
      readonly connection: DockingConnection;
    }
  | {
      readonly status: 'port-occupied';
      readonly shipId: string;
    }
  | {
      readonly status: 'out-of-range';
      readonly distance: number;
    }
  | {
      readonly status: 'too-fast';
      readonly relativeSpeed: number;
    };

function assertFiniteVector(value: Vector2, label: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError(`${label} must contain finite coordinates.`);
  }
}

function transformPortPosition(port: DockingPort, station: Station): Vector2 {
  const cosine = Math.cos(station.rotation);
  const sine = Math.sin(station.rotation);

  return {
    x:
      station.position.x +
      port.localPosition.x * cosine -
      port.localPosition.y * sine,
    y:
      station.position.y +
      port.localPosition.x * sine +
      port.localPosition.y * cosine
  };
}

function rotateToLocal(position: Vector2, rotation: number): Vector2 {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return {
    x: position.x * cosine + position.y * sine,
    y: -position.x * sine + position.y * cosine
  };
}

export class DockingSystem {
  private readonly connectionsByShip = new Map<string, DockingConnection>();
  private readonly occupantsByStation = new Map<string, Map<string, string>>();
  private readonly policy: DockingPolicy;

  constructor(policy: DockingPolicy) {
    if (
      !Number.isFinite(policy.captureRadius) ||
      policy.captureRadius <= 0 ||
      !Number.isFinite(policy.maximumRelativeSpeed) ||
      policy.maximumRelativeSpeed < 0
    ) {
      throw new RangeError('Docking policy values are outside valid ranges.');
    }

    this.policy = Object.freeze({ ...policy });
  }

  dockShip(
    shipId: string,
    shipState: RigidBodyState,
    station: Station,
    port: DockingPort
  ): DockingAttemptResult {
    if (shipId.trim().length === 0) {
      throw new TypeError('Docking ship ID must not be empty.');
    }

    if (port.id.trim().length === 0 || port.stationId !== station.id) {
      throw new TypeError('Docking port must identify its station.');
    }

    assertFiniteVector(shipState.position, 'Ship position');
    assertFiniteVector(shipState.velocity, 'Ship velocity');
    assertFiniteVector(port.localPosition, 'Docking port position');

    if (
      !Number.isFinite(shipState.rotation) ||
      !Number.isFinite(shipState.angularVelocity) ||
      !Number.isFinite(port.localRotation)
    ) {
      throw new RangeError('Docking rotations must be finite.');
    }

    const existingConnection = this.connectionsByShip.get(shipId);

    if (existingConnection !== undefined) {
      return { status: 'already-docked', connection: existingConnection };
    }

    const stationOccupants = this.occupantsByStation.get(station.id);
    const portOccupant = stationOccupants?.get(port.id);

    if (portOccupant !== undefined) {
      return { status: 'port-occupied', shipId: portOccupant };
    }

    const portPosition = transformPortPosition(port, station);
    assertFiniteVector(portPosition, 'World docking port position');
    const distance = Math.hypot(
      shipState.position.x - portPosition.x,
      shipState.position.y - portPosition.y
    );

    if (!Number.isFinite(distance)) {
      throw new RangeError('Docking distance exceeds numeric range.');
    }

    if (distance > this.policy.captureRadius) {
      return { status: 'out-of-range', distance };
    }

    const relativeSpeed = Math.hypot(
      shipState.velocity.x,
      shipState.velocity.y
    );

    if (!Number.isFinite(relativeSpeed)) {
      throw new RangeError('Relative docking speed exceeds numeric range.');
    }

    if (relativeSpeed > this.policy.maximumRelativeSpeed) {
      return { status: 'too-fast', relativeSpeed };
    }

    const localPosition = rotateToLocal(
      {
        x: portPosition.x - station.position.x,
        y: portPosition.y - station.position.y
      },
      station.rotation
    );
    const connection: DockingConnection = Object.freeze({
      shipId,
      stationId: station.id,
      portId: port.id,
      localPosition: Object.freeze(localPosition),
      localRotation: port.localRotation
    });
    const occupants = stationOccupants ?? new Map<string, string>();

    occupants.set(port.id, shipId);
    this.occupantsByStation.set(station.id, occupants);
    this.connectionsByShip.set(shipId, connection);

    return { status: 'docked', connection };
  }

  updateDockedShip(
    shipId: string,
    station: Station
  ): RigidBodyState | undefined {
    const connection = this.connectionsByShip.get(shipId);

    if (connection === undefined) {
      return undefined;
    }

    if (connection.stationId !== station.id) {
      throw new TypeError('Docked ship is being updated against another station.');
    }

    const worldOffset = {
      x:
        connection.localPosition.x * Math.cos(station.rotation) -
        connection.localPosition.y * Math.sin(station.rotation),
      y:
        connection.localPosition.x * Math.sin(station.rotation) +
        connection.localPosition.y * Math.cos(station.rotation)
    };

    const state: RigidBodyState = {
      position: {
        x: station.position.x + worldOffset.x,
        y: station.position.y + worldOffset.y
      },
      velocity: { x: 0, y: 0 },
      rotation: station.rotation + connection.localRotation,
      angularVelocity: 0
    };

    if (
      !Number.isFinite(state.position.x) ||
      !Number.isFinite(state.position.y) ||
      !Number.isFinite(state.rotation)
    ) {
      throw new RangeError('Docked ship transform exceeds numeric range.');
    }

    return state;
  }

  undockShip(
    shipId: string,
    station: Station,
    releaseVelocity: Vector2
  ): RigidBodyState | undefined {
    const connection = this.connectionsByShip.get(shipId);

    if (connection === undefined) {
      return undefined;
    }

    if (connection.stationId !== station.id) {
      throw new TypeError('Docked ship is being released from another station.');
    }

    assertFiniteVector(releaseVelocity, 'Release velocity');
    const state = this.updateDockedShip(shipId, station);

    if (state === undefined) {
      throw new Error('Docked ship disappeared while undocking.');
    }

    this.connectionsByShip.delete(shipId);
    const occupants = this.occupantsByStation.get(station.id);
    occupants?.delete(connection.portId);

    if (occupants?.size === 0) {
      this.occupantsByStation.delete(station.id);
    }

    return {
      ...state,
      velocity: { ...releaseVelocity }
    };
  }

  getConnection(shipId: string): DockingConnection | undefined {
    return this.connectionsByShip.get(shipId);
  }

  getPortOccupant(stationId: string, portId: string): string | undefined {
    return this.occupantsByStation.get(stationId)?.get(portId);
  }
}
