import { describe, expect, it } from 'vitest';
import { chunkKey } from '../src/core/coordinates';
import { Construction } from '../src/construction/construction';
import { calculateAvailablePowerByChunk } from '../src/energy/powerBudget';
import { calculateRigidBodyProperties } from '../src/physics/rigidBodyProperties';
import {
  buildThrusterLayout,
  calculateThrusterForces,
  simulateThrusterStep
} from '../src/physics/thrusters';

describe('thruster forces', () => {
  it('calculates northward force and torque about the construction center', () => {
    const construction = new Construction('flight-test');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    const thruster = construction.placeTile(
      { x: 1, y: 0 },
      'thruster',
      'north'
    );

    const report = calculateThrusterForces(
      buildThrusterLayout(construction),
      calculateRigidBodyProperties(construction).centerOfMass,
      [{ tileId: thruster.id, throttle: 1 }],
      new Map([[chunkKey({ x: 0, y: 0 }), 25]])
    );

    expect(report.force.x).toBeCloseTo(0);
    expect(report.force.y).toBeCloseTo(-100);
    expect(report.torque).toBeCloseTo(-20);
    expect(report.requestedPower).toBe(25);
    expect(report.allocatedPower).toBe(25);
    expect(report.activeThrusterCount).toBe(1);
  });

  it('scales thrust when the propulsion priority receives partial power', () => {
    const construction = new Construction('low-power-flight');
    const thruster = construction.placeTile(
      { x: 32, y: 0 },
      'thruster',
      'east'
    );

    const report = calculateThrusterForces(
      buildThrusterLayout(construction),
      calculateRigidBodyProperties(construction).centerOfMass,
      [{ tileId: thruster.id, throttle: 1 }],
      new Map([[chunkKey({ x: 1, y: 0 }), 12.5]])
    );

    expect(report.force.x).toBeCloseTo(50);
    expect(report.force.y).toBeCloseTo(0);
    expect(report.requestedPower).toBe(25);
    expect(report.allocatedPower).toBe(12.5);
    expect(report.unusedPower).toBe(0);
  });

  it('rejects commands for non-thrusters and missing chunk power budgets', () => {
    const construction = new Construction('invalid-flight');
    const hull = construction.placeTile({ x: 0, y: 0 }, 'hull');
    const thruster = construction.placeTile({ x: 1, y: 0 }, 'thruster');
    const layout = buildThrusterLayout(construction);
    const centerOfMass = calculateRigidBodyProperties(construction).centerOfMass;

    expect(() =>
      calculateThrusterForces(
        layout,
        centerOfMass,
        [{ tileId: hull.id, throttle: 1 }],
        new Map([[chunkKey({ x: 0, y: 0 }), 100]])
      )
    ).toThrow(`Thruster tile not found in layout: ${hull.id}.`);

    expect(() =>
      calculateThrusterForces(
        layout,
        centerOfMass,
        [{ tileId: thruster.id, throttle: 1 }],
        new Map()
      )
    ).toThrow('Missing power budget for chunk 0,0.');
  });

  it('integrates thrust force into ship velocity and rotation', () => {
    const construction = new Construction('moving-ship');
    construction.placeTile({ x: 0, y: 0 }, 'reactor');
    construction.placeTile({ x: 2, y: 0 }, 'hull');
    const thruster = construction.placeTile(
      { x: 1, y: 0 },
      'thruster',
      'north'
    );

    const properties = calculateRigidBodyProperties(construction);
    const step = simulateThrusterStep(
      {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        angularVelocity: 0
      },
      properties,
      buildThrusterLayout(construction),
      [{ tileId: thruster.id, throttle: 1 }],
      calculateAvailablePowerByChunk(construction, 'propulsion'),
      0.1
    );

    expect(step.state.velocity.x).toBeCloseTo(0);
    expect(step.state.velocity.y).toBeCloseTo(-100 / 150 * 0.1);
    expect(step.state.position.y).toBeCloseTo(-100 / 150 * 0.01);
    expect(step.state.angularVelocity).toBeLessThan(0);
    expect(step.thrusterForces.allocatedPower).toBe(25);
  });
});
