import type { Vector2, RigidBodyState } from '../physics/rigidBody';

export interface NavigationPolicy {
  readonly maxSpeed: number;
  readonly maxAcceleration: number;
  readonly responseTimeSeconds: number;
  readonly arrivalRadius: number;
  readonly arrivalSpeed: number;
  readonly maxTurnRateRadiansPerSecond: number;
}

export interface NavigationIntent {
  readonly distanceToTarget: number;
  readonly desiredVelocity: Vector2;
  readonly desiredAcceleration: Vector2;
  readonly desiredHeadingRadians: number;
  readonly turnRateRadiansPerSecond: number;
  readonly throttle: number;
  readonly arrived: boolean;
}

export interface NavigationRouteDefinition {
  readonly id: string;
  readonly waypoints: readonly Vector2[];
}

export interface NavigationRouteStep {
  readonly routeId: string;
  readonly waypointIndex: number;
  readonly target: Vector2;
  readonly routeComplete: boolean;
  readonly intent: NavigationIntent;
}

export const DEFAULT_NAVIGATION_POLICY: NavigationPolicy = Object.freeze({
  maxSpeed: 80,
  maxAcceleration: 40,
  responseTimeSeconds: 0.5,
  arrivalRadius: 1,
  arrivalSpeed: 0.5,
  maxTurnRateRadiansPerSecond: Math.PI
});

function assertFiniteVector(vector: Vector2, label: string): void {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
    throw new RangeError(`${label} must contain finite coordinates.`);
  }
}

function assertValidPolicy(policy: NavigationPolicy): void {
  const positiveValues = [
    policy.maxSpeed,
    policy.maxAcceleration,
    policy.responseTimeSeconds,
    policy.maxTurnRateRadiansPerSecond
  ];

  if (!positiveValues.every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError(
      'Navigation speed, acceleration, response time, and turn rate must be positive and finite.'
    );
  }

  if (
    !Number.isFinite(policy.arrivalRadius) ||
    policy.arrivalRadius < 0 ||
    !Number.isFinite(policy.arrivalSpeed) ||
    policy.arrivalSpeed < 0
  ) {
    throw new RangeError(
      'Navigation arrival radius and speed must be finite and non-negative.'
    );
  }
}

function normalizeAngle(angleRadians: number): number {
  const fullTurn = Math.PI * 2;
  return (
    (((angleRadians + Math.PI) % fullTurn) + fullTurn) % fullTurn -
    Math.PI
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateNavigationIntent(
  state: RigidBodyState,
  target: Vector2,
  policy: NavigationPolicy = DEFAULT_NAVIGATION_POLICY
): NavigationIntent {
  assertFiniteVector(state.position, 'Navigation position');
  assertFiniteVector(state.velocity, 'Navigation velocity');
  assertFiniteVector(target, 'Navigation target');

  if (!Number.isFinite(state.rotation)) {
    throw new RangeError('Navigation rotation must be finite.');
  }

  assertValidPolicy(policy);
  const targetDelta = {
    x: target.x - state.position.x,
    y: target.y - state.position.y
  };
  const distanceToTarget = Math.hypot(targetDelta.x, targetDelta.y);

  if (!Number.isFinite(distanceToTarget)) {
    throw new RangeError('Navigation target distance overflow.');
  }

  const stoppingDistance = Math.max(0, distanceToTarget - policy.arrivalRadius);
  const stoppingSpeedSquared =
    2 * policy.maxAcceleration * stoppingDistance;
  const desiredSpeed = Math.min(
    policy.maxSpeed,
    Number.isFinite(stoppingSpeedSquared)
      ? Math.sqrt(stoppingSpeedSquared)
      : policy.maxSpeed
  );
  const direction =
    distanceToTarget === 0
      ? { x: 0, y: 0 }
      : {
          x: targetDelta.x / distanceToTarget,
          y: targetDelta.y / distanceToTarget
        };
  const desiredVelocity = {
    x: direction.x * desiredSpeed,
    y: direction.y * desiredSpeed
  };
  const velocityError = {
    x: desiredVelocity.x - state.velocity.x,
    y: desiredVelocity.y - state.velocity.y
  };
  const rawAcceleration = {
    x: velocityError.x / policy.responseTimeSeconds,
    y: velocityError.y / policy.responseTimeSeconds
  };
  const rawAccelerationMagnitude = Math.hypot(
    rawAcceleration.x,
    rawAcceleration.y
  );

  if (!Number.isFinite(rawAccelerationMagnitude)) {
    throw new RangeError('Navigation acceleration overflow.');
  }

  const accelerationScale =
    rawAccelerationMagnitude > policy.maxAcceleration
      ? policy.maxAcceleration / rawAccelerationMagnitude
      : 1;
  const desiredAcceleration = {
    x: rawAcceleration.x * accelerationScale,
    y: rawAcceleration.y * accelerationScale
  };
  const accelerationMagnitude =
    rawAccelerationMagnitude * accelerationScale;
  const desiredHeadingRadians =
    desiredSpeed > 0
      ? Math.atan2(desiredVelocity.y, desiredVelocity.x)
      : distanceToTarget > 0
        ? Math.atan2(targetDelta.y, targetDelta.x)
        : normalizeAngle(state.rotation);
  const headingError = normalizeAngle(
    desiredHeadingRadians - state.rotation
  );
  const turnRateRadiansPerSecond = clamp(
    headingError / policy.responseTimeSeconds,
    -policy.maxTurnRateRadiansPerSecond,
    policy.maxTurnRateRadiansPerSecond
  );

  return {
    distanceToTarget,
    desiredVelocity,
    desiredAcceleration,
    desiredHeadingRadians,
    turnRateRadiansPerSecond,
    throttle: accelerationMagnitude / policy.maxAcceleration,
    arrived:
      distanceToTarget <= policy.arrivalRadius &&
      Math.hypot(state.velocity.x, state.velocity.y) <= policy.arrivalSpeed
  };
}

export class NavigationController {
  readonly routeId: string;
  private readonly waypoints: readonly Vector2[];
  private readonly policy: NavigationPolicy;
  private currentWaypointIndex = 0;
  private routeComplete = false;

  constructor(
    route: NavigationRouteDefinition,
    policy: NavigationPolicy = DEFAULT_NAVIGATION_POLICY
  ) {
    if (typeof route.id !== 'string' || route.id.trim().length === 0) {
      throw new TypeError('Navigation route ID must not be empty.');
    }

    if (!Array.isArray(route.waypoints) || route.waypoints.length === 0) {
      throw new TypeError('Navigation route must contain at least one waypoint.');
    }

    route.waypoints.forEach((waypoint) =>
      assertFiniteVector(waypoint, 'Navigation waypoint')
    );
    assertValidPolicy(policy);

    this.routeId = route.id;
    this.waypoints = Object.freeze(
      route.waypoints.map((waypoint) => Object.freeze({ ...waypoint }))
    );
    this.policy = Object.freeze({ ...policy });
  }

  update(state: RigidBodyState): NavigationRouteStep {
    if (this.routeComplete) {
      const finalWaypoint = this.getWaypoint(this.currentWaypointIndex);
      return {
        routeId: this.routeId,
        waypointIndex: this.currentWaypointIndex,
        target: finalWaypoint,
        routeComplete: true,
        intent: calculateNavigationIntent(state, finalWaypoint, this.policy)
      };
    }

    let target = this.getWaypoint(this.currentWaypointIndex);
    let intent = calculateNavigationIntent(state, target, this.policy);

    if (intent.arrived) {
      if (this.currentWaypointIndex === this.waypoints.length - 1) {
        this.routeComplete = true;
      } else {
        this.currentWaypointIndex += 1;
        target = this.getWaypoint(this.currentWaypointIndex);
        intent = calculateNavigationIntent(state, target, this.policy);
      }
    }

    return {
      routeId: this.routeId,
      waypointIndex: this.currentWaypointIndex,
      target,
      routeComplete: this.routeComplete,
      intent
    };
  }

  private getWaypoint(index: number): Vector2 {
    const waypoint = this.waypoints[index];

    if (waypoint === undefined) {
      throw new Error(`Navigation waypoint disappeared at index ${index}.`);
    }

    return waypoint;
  }
}
