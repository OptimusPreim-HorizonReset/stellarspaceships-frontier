export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export interface RigidBodyState {
  readonly position: Vector2;
  readonly velocity: Vector2;
  readonly rotation: number;
  readonly angularVelocity: number;
}

export function integrateRigidBody(
  state: RigidBodyState,
  localForce: Vector2,
  torque: number,
  mass: number,
  momentOfInertia: number,
  deltaTimeSeconds: number
): RigidBodyState {
  const inputs = [
    state.position.x,
    state.position.y,
    state.velocity.x,
    state.velocity.y,
    state.rotation,
    state.angularVelocity,
    localForce.x,
    localForce.y,
    torque,
    mass,
    momentOfInertia,
    deltaTimeSeconds
  ];

  if (!inputs.every(Number.isFinite)) {
    throw new RangeError('Rigid body state and inputs must be finite.');
  }

  if (mass <= 0 || momentOfInertia <= 0) {
    throw new RangeError('Mass and moment of inertia must be positive.');
  }

  if (deltaTimeSeconds < 0) {
    throw new RangeError('Delta time must not be negative.');
  }

  const cosine = Math.cos(state.rotation);
  const sine = Math.sin(state.rotation);
  const worldForce = {
    x: localForce.x * cosine - localForce.y * sine,
    y: localForce.x * sine + localForce.y * cosine
  };
  const velocity = {
    x: state.velocity.x + (worldForce.x / mass) * deltaTimeSeconds,
    y: state.velocity.y + (worldForce.y / mass) * deltaTimeSeconds
  };
  const angularVelocity =
    state.angularVelocity +
    (torque / momentOfInertia) * deltaTimeSeconds;
  const nextState: RigidBodyState = {
    position: {
      x: state.position.x + velocity.x * deltaTimeSeconds,
      y: state.position.y + velocity.y * deltaTimeSeconds
    },
    velocity,
    rotation: state.rotation + angularVelocity * deltaTimeSeconds,
    angularVelocity
  };
  const results = [
    nextState.position.x,
    nextState.position.y,
    nextState.velocity.x,
    nextState.velocity.y,
    nextState.rotation,
    nextState.angularVelocity
  ];

  if (!results.every(Number.isFinite)) {
    throw new RangeError('Rigid body integration overflow.');
  }

  return nextState;
}
