import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';
import type { RigidBodyState } from '../src/physics/rigidBody';
import { Station } from '../src/world/station';
import type { DockingPort } from '../src/world/docking';
import { DockingSystem } from '../src/world/docking';

function createStation(position = { x: 10, y: 5 }): Station {
  const construction = new Construction('dock-station');
  construction.placeTile({ x: 0, y: 0 }, 'hull');

  return new Station({
    id: construction.id,
    type: 'defense',
    construction,
    position,
    rotation: Math.PI / 2,
    ownerId: null
  });
}

const port: DockingPort = {
  id: 'north-port',
  stationId: 'dock-station',
  localPosition: { x: 2, y: 0 },
  localRotation: 0
};

function shipState(position: RigidBodyState['position'], velocity = { x: 0, y: 0 }): RigidBodyState {
  return {
    position,
    velocity,
    rotation: 0,
    angularVelocity: 0
  };
}

describe('DockingSystem', () => {
  it('captures within the docking envelope and follows station transforms', () => {
    const docking = new DockingSystem({
      captureRadius: 2,
      maximumRelativeSpeed: 1
    });
    const station = createStation();
    const ship = shipState({ x: 10, y: 7 });
    const result = docking.dockShip('ship-1', ship, station, port);

    expect(result.status).toBe('docked');
    expect(docking.getPortOccupant(station.id, port.id)).toBe('ship-1');

    const movedStation = createStation({ x: 20, y: 10 });
    const followed = docking.updateDockedShip('ship-1', movedStation);

    expect(followed?.position.x).toBeCloseTo(20);
    expect(followed?.position.y).toBeCloseTo(12);
    expect(followed?.rotation).toBeCloseTo(Math.PI / 2);
  });

  it('enforces range, speed, and one ship per port', () => {
    const docking = new DockingSystem({
      captureRadius: 1,
      maximumRelativeSpeed: 0.5
    });
    const station = createStation();

    expect(
      docking.dockShip('far-ship', shipState({ x: 20, y: 20 }), station, port)
        .status
    ).toBe('out-of-range');
    expect(
      docking.dockShip(
        'fast-ship',
        shipState({ x: 10, y: 7 }, { x: 1, y: 0 }),
        station,
        port
      ).status
    ).toBe('too-fast');
    expect(
      docking.dockShip('ship-1', shipState({ x: 10, y: 7 }), station, port)
        .status
    ).toBe('docked');
    expect(
      docking.dockShip('ship-2', shipState({ x: 10, y: 7 }), station, port)
    ).toEqual({ status: 'port-occupied', shipId: 'ship-1' });
    expect(docking.dockShip('ship-1', shipState({ x: 10, y: 7 }), station, port).status)
      .toBe('already-docked');
  });

  it('releases the port with an explicit velocity on undocking', () => {
    const docking = new DockingSystem({
      captureRadius: 1,
      maximumRelativeSpeed: 1
    });
    const station = createStation();
    docking.dockShip('ship-1', shipState({ x: 10, y: 7 }), station, port);

    const released = docking.undockShip(
      'ship-1',
      station,
      { x: 0, y: 2 }
    );

    expect(released?.velocity).toEqual({ x: 0, y: 2 });
    expect(docking.getPortOccupant(station.id, port.id)).toBeUndefined();
    expect(docking.getConnection('ship-1')).toBeUndefined();
  });

  it('rejects docking geometry that overflows world coordinates', () => {
    const docking = new DockingSystem({
      captureRadius: 2,
      maximumRelativeSpeed: 1
    });
    const station = createStation({ x: Number.MAX_VALUE, y: 0 });

    expect(() =>
      docking.dockShip(
        'ship-1',
        shipState({ x: 0, y: 0 }),
        station,
        {
          ...port,
          localPosition: { x: Number.MAX_VALUE, y: 0 }
        }
      )
    ).toThrow('World docking port position must contain finite coordinates.');
  });
});
