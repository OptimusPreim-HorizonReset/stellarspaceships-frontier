import { describe, expect, it } from 'vitest';
import { chunkKey } from '../src/core/coordinates';
import { Construction } from '../src/construction/construction';
import { calculatePowerBalance } from '../src/energy/powerBalance';
import { calculateAvailablePowerByChunk } from '../src/energy/powerBudget';
import { calculateRigidBodyProperties } from '../src/physics/rigidBodyProperties';
import {
  buildThrusterLayout,
  simulateThrusterStep
} from '../src/physics/thrusters';
import type { RigidBodyState } from '../src/physics/rigidBody';
import type { ThrusterStepReport } from '../src/physics/thrusters';

describe('Gate B integration profile', () => {
  it('keeps a 1,000-tile ship powered and numerically stable over ten seconds', () => {
    const construction = new Construction('gate-b-1000-tile-ship');

    for (let y = 0; y < 25; y += 1) {
      for (let x = 0; x < 40; x += 1) {
        construction.placeTile({ x, y }, 'hull');
      }
    }

    construction.placeTile({ x: 0, y: 0 }, 'reactor');
    const thrusters = [
      construction.placeTile({ x: 15, y: 24 }, 'thruster', 'north'),
      construction.placeTile({ x: 24, y: 24 }, 'thruster', 'north')
    ];
    const power = calculatePowerBalance(construction);
    const rigidBody = calculateRigidBodyProperties(construction);
    const thrusterLayout = buildThrusterLayout(construction);
    const availablePower = calculateAvailablePowerByChunk(
      construction,
      'propulsion'
    );
    const commands = thrusters.map((thruster) => ({
      tileId: thruster.id,
      throttle: 1
    }));
    let state: RigidBodyState = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      angularVelocity: 0
    };

    expect(construction.tileCount).toBe(1000);
    expect(construction.chunkCount).toBe(2);
    expect(power.totalPowerGeneration).toBe(1000);
    expect(power.totalPowerConsumption).toBe(50);
    expect(rigidBody.mass).toBeGreaterThan(0);
    expect(rigidBody.momentOfInertia).toBeGreaterThan(0);
    expect(availablePower.get(chunkKey({ x: 0, y: 0 }))).toBe(1000);
    expect(thrusterLayout).toHaveLength(2);

    let lastStep: ThrusterStepReport | undefined;

    for (let frame = 0; frame < 600; frame += 1) {
      lastStep = simulateThrusterStep(
        state,
        rigidBody,
        thrusterLayout,
        commands,
        availablePower,
        1 / 60
      );
      state = lastStep.state;
    }

    expect(lastStep?.thrusterForces.allocatedPower).toBe(50);
    expect(state.velocity.y).toBeLessThan(0);
    expect(state.position.y).toBeLessThan(0);
    expect(Math.abs(state.angularVelocity)).toBeLessThan(0.01);
    expect([
      state.position.x,
      state.position.y,
      state.velocity.x,
      state.velocity.y,
      state.rotation,
      state.angularVelocity
    ].every(Number.isFinite)).toBe(true);
  });
});
