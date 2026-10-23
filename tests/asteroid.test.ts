import { describe, expect, it } from 'vitest';
import { isResourceType } from '../src/core/tiles';
import { Asteroid } from '../src/mining/asteroid';
import type { RigidBodyState } from '../src/physics/rigidBody';

const initialState: RigidBodyState = {
  position: { x: 12, y: -8 },
  velocity: { x: 0.5, y: 0 },
  rotation: 0.25,
  angularVelocity: 0
};

describe('Asteroid', () => {
  it('uses chunked rock tiles with per-tile resource deposits', () => {
    const asteroid = new Asteroid({
      id: 'asteroid-1',
      state: initialState,
      tiles: [
        {
          position: { x: 31, y: 0 },
          resourceType: 'ore',
          resourceAmount: 3,
          hitPoints: 80
        },
        {
          position: { x: 32, y: 0 },
          resourceType: 'ice',
          resourceAmount: 1.5
        }
      ]
    });
    const firstTile = asteroid.construction.getTile({ x: 31, y: 0 });
    const secondTile = asteroid.construction.getTile({ x: 32, y: 0 });

    expect(asteroid.id).toBe('asteroid-1');
    expect(asteroid.construction.id).toBe(asteroid.id);
    expect(asteroid.construction.tileCount).toBe(2);
    expect(asteroid.construction.chunkCount).toBe(2);
    expect(firstTile).toMatchObject({ type: 'rock', hp: 80 });
    expect(secondTile).toMatchObject({ type: 'rock', hp: 100 });
    expect(asteroid.state).toEqual(initialState);
    expect(
      firstTile === undefined
        ? undefined
        : asteroid.getResourceDeposit(firstTile.id)
    ).toEqual({ resourceType: 'ore', amount: 3 });
    expect(
      secondTile === undefined
        ? undefined
        : asteroid.getResourceDeposit(secondTile.id)
    ).toEqual({ resourceType: 'ice', amount: 1.5 });

    asteroid.setRigidBodyState({
      ...initialState,
      position: { x: 20, y: 5 }
    });
    expect(asteroid.state.position).toEqual({ x: 20, y: 5 });
  });

  it('rejects empty, duplicate, and invalid asteroid tile definitions', () => {
    expect(
      () =>
        new Asteroid({
          id: 'empty-asteroid',
          state: initialState,
          tiles: []
        })
    ).toThrow('Asteroid must contain at least one tile.');

    expect(
      () =>
        new Asteroid({
          id: 'duplicate-asteroid',
          state: initialState,
          tiles: [
            {
              position: { x: 0, y: 0 },
              resourceType: 'ore',
              resourceAmount: 1
            },
            {
              position: { x: 0, y: 0 },
              resourceType: 'ore',
              resourceAmount: 1
            }
          ]
        })
    ).toThrow('An asteroid tile already exists at (0, 0).');

    expect(
      () =>
        new Asteroid({
          id: 'invalid-asteroid',
          state: initialState,
          tiles: [
            {
              position: { x: 0, y: 0 },
              resourceType: 'ore',
              resourceAmount: 0,
              hitPoints: 101
            }
          ]
        })
    ).toThrow('Asteroid resource amount must be finite and positive.');

    expect(
      () =>
        new Asteroid({
          id: 'invalid-hit-points',
          state: initialState,
          tiles: [
            {
              position: { x: 0, y: 0 },
              resourceType: 'ore',
              resourceAmount: 1,
              hitPoints: 101
            }
          ]
        })
    ).toThrow('Asteroid tile hit points are outside valid ranges.');
  });

  it('validates resource types and rigid body state', () => {
    expect(isResourceType('gas')).toBe(true);
    expect(isResourceType('void')).toBe(false);
    expect(
      () =>
        new Asteroid({
          id: 'invalid-state',
          state: {
            ...initialState,
            position: { x: Number.POSITIVE_INFINITY, y: 0 }
          },
          tiles: [
            {
              position: { x: 0, y: 0 },
              resourceType: 'scrap',
              resourceAmount: 1
            }
          ]
        })
    ).toThrow('Asteroid rigid body state must be finite.');
  });
});
