import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';
import { ResourceInventory } from '../src/mining/resourceLoot';
import { Station } from '../src/world/station';
import { DockingSystem } from '../src/world/docking';
import { transferResourcesWhileDocked } from '../src/world/resourceTransfer';
import type { DockingPort } from '../src/world/docking';

function createStation(id = 'station-1'): Station {
  const construction = new Construction(id);
  construction.placeTile({ x: 0, y: 0 }, 'hull');

  return new Station({
    id,
    type: 'mining',
    construction,
    position: { x: 10, y: 5 },
    rotation: 0,
    ownerId: null
  });
}

const port: DockingPort = {
  id: 'cargo-port',
  stationId: 'station-1',
  localPosition: { x: 0, y: 0 },
  localRotation: 0
};

describe('docked resource transfer', () => {
  it('allows an attached ship to transfer inventory to its station', () => {
    const station = createStation();
    const docking = new DockingSystem({
      captureRadius: 2,
      maximumRelativeSpeed: 1
    });
    const shipInventory = new ResourceInventory();
    shipInventory.collect({
      id: 'asteroid-1:tile:1',
      asteroidId: 'asteroid-1',
      sourceTileId: 1,
      resourceType: 'ore',
      amount: 5
    });

    docking.dockShip(
      'ship-1',
      {
        position: { x: 10.5, y: 5 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        angularVelocity: 0
      },
      station,
      port
    );

    expect(
      transferResourcesWhileDocked(
        docking,
        'ship-1',
        station,
        shipInventory,
        'ore',
        3
      )
    ).toEqual({
      status: 'transferred',
      resourceType: 'ore',
      amount: 3,
      sourceRemaining: 2,
      destinationTotal: 3
    });
    expect(shipInventory.getAmount('ore')).toBe(2);
    expect(station.inventory.getAmount('ore')).toBe(3);
  });

  it('prevents transfer when undocked, attached elsewhere, or underfunded', () => {
    const station = createStation('station-1');
    const otherStation = createStation('station-2');
    const docking = new DockingSystem({
      captureRadius: 2,
      maximumRelativeSpeed: 1
    });
    const shipInventory = new ResourceInventory();

    expect(
      transferResourcesWhileDocked(
        docking,
        'ship-1',
        station,
        shipInventory,
        'ore',
        1
      )
    ).toEqual({ status: 'not-docked' });

    docking.dockShip(
      'ship-1',
      {
        position: { x: 10, y: 5 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        angularVelocity: 0
      },
      otherStation,
      { ...port, stationId: otherStation.id }
    );

    expect(
      transferResourcesWhileDocked(
        docking,
        'ship-1',
        station,
        shipInventory,
        'ore',
        1
      )
    ).toEqual({ status: 'wrong-station', dockedStationId: otherStation.id });

    expect(
      transferResourcesWhileDocked(
        docking,
        'ship-1',
        otherStation,
        shipInventory,
        'ore',
        1
      )
    ).toMatchObject({
      status: 'insufficient-resources',
      availableAmount: 0
    });
  });
});
