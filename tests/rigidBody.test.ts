import { describe, expect, it } from 'vitest';
import { integrateRigidBody } from '../src/physics/rigidBody';

describe('rigid body integration', () => {
  it('applies force with semi-implicit Euler integration', () => {
    const state = integrateRigidBody(
      {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        angularVelocity: 0
      },
      { x: 10, y: 0 },
      0,
      5,
      2,
      1
    );

    expect(state.velocity).toEqual({ x: 2, y: 0 });
    expect(state.position).toEqual({ x: 2, y: 0 });
  });

  it('rotates local force into the world frame and applies torque', () => {
    const state = integrateRigidBody(
      {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        rotation: Math.PI / 2,
        angularVelocity: 0
      },
      { x: 0, y: -10 },
      10,
      10,
      2,
      0.5
    );

    expect(state.velocity.x).toBeCloseTo(0.5);
    expect(state.velocity.y).toBeCloseTo(0);
    expect(state.angularVelocity).toBeCloseTo(2.5);
    expect(state.rotation).toBeCloseTo(Math.PI / 2 + 1.25);
  });

  it('rejects invalid physical properties and time steps', () => {
    const state = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      angularVelocity: 0
    };

    expect(() =>
      integrateRigidBody(state, { x: 0, y: 0 }, 0, 0, 1, 1)
    ).toThrow('Mass and moment of inertia must be positive.');
    expect(() =>
      integrateRigidBody(state, { x: 0, y: 0 }, 0, 1, 1, -1)
    ).toThrow('Delta time must not be negative.');
  });
});
