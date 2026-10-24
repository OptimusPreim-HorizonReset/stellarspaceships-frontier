import { describe, expect, it } from 'vitest';
import {
  calculateNavigationIntent,
  NavigationController
} from '../src/ai/navigation';
import type { NavigationPolicy } from '../src/ai/navigation';
import type { RigidBodyState } from '../src/physics/rigidBody';

const policy: NavigationPolicy = {
  maxSpeed: 10,
  maxAcceleration: 2,
  responseTimeSeconds: 1,
  arrivalRadius: 1,
  arrivalSpeed: 0.2,
  maxTurnRateRadiansPerSecond: 1
};

const stationaryState: RigidBodyState = {
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  rotation: 0,
  angularVelocity: 0
};

describe('NPC navigation AI', () => {
  it('steers toward a target with bounded speed, acceleration, and turn rate', () => {
    const intent = calculateNavigationIntent(
      stationaryState,
      { x: 100, y: 0 },
      policy
    );

    expect(intent.desiredVelocity).toEqual({ x: 10, y: 0 });
    expect(intent.desiredAcceleration).toEqual({ x: 2, y: 0 });
    expect(intent.throttle).toBe(1);
    expect(intent.turnRateRadiansPerSecond).toBe(0);
    expect(intent.arrived).toBe(false);
  });

  it('brakes existing velocity while approaching the arrival radius', () => {
    const intent = calculateNavigationIntent(
      {
        ...stationaryState,
        velocity: { x: 20, y: 0 }
      },
      { x: 10, y: 0 },
      policy
    );

    expect(intent.desiredVelocity.x).toBe(6);
    expect(intent.desiredAcceleration).toEqual({ x: -2, y: 0 });
    expect(intent.throttle).toBe(1);
    expect(intent.arrived).toBe(false);
  });

  it('marks arrival only when both distance and speed are within policy', () => {
    const arrived = calculateNavigationIntent(
      stationaryState,
      { x: 0.5, y: 0 },
      policy
    );
    const stillMoving = calculateNavigationIntent(
      {
        ...stationaryState,
        velocity: { x: 1, y: 0 }
      },
      { x: 0.5, y: 0 },
      policy
    );

    expect(arrived.arrived).toBe(true);
    expect(stillMoving.arrived).toBe(false);
  });

  it('advances a route through waypoints and marks its final destination', () => {
    const controller = new NavigationController(
      {
        id: 'route-1',
        waypoints: [
          { x: 0, y: 0 },
          { x: 10, y: 0 }
        ]
      },
      policy
    );

    const firstStep = controller.update(stationaryState);
    expect(firstStep).toMatchObject({
      waypointIndex: 1,
      target: { x: 10, y: 0 },
      routeComplete: false
    });

    const finalStep = controller.update({
      ...stationaryState,
      position: { x: 10, y: 0 }
    });
    expect(finalStep).toMatchObject({
      waypointIndex: 1,
      target: { x: 10, y: 0 },
      routeComplete: true,
      intent: { arrived: true }
    });
  });

  it('rejects invalid policies, states, and routes', () => {
    expect(() =>
      calculateNavigationIntent(stationaryState, { x: 1, y: 0 }, {
        ...policy,
        maxSpeed: 0
      })
    ).toThrow('Navigation speed, acceleration, response time, and turn rate must be positive and finite.');
    expect(() =>
      calculateNavigationIntent(stationaryState, { x: Number.NaN, y: 0 }, policy)
    ).toThrow('Navigation target must contain finite coordinates.');
    expect(
      () =>
        new NavigationController({
          id: 'empty-route',
          waypoints: []
        })
    ).toThrow('Navigation route must contain at least one waypoint.');
  });
});
