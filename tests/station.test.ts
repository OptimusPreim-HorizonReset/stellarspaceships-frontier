import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';
import { isStationType, Station } from '../src/world/station';

function createStationConstruction(id = 'station-1'): Construction {
  const construction = new Construction(id);
  construction.placeTile({ x: 0, y: 0 }, 'hull');
  construction.placeTile({ x: 1, y: 0 }, 'reactor');
  return construction;
}

describe('Station', () => {
  it('wraps an existing construction without duplicating its tiles', () => {
    const construction = createStationConstruction();
    const station = new Station({
      id: 'station-1',
      type: 'mining',
      construction,
      position: { x: 100, y: -25 },
      rotation: Math.PI / 2,
      ownerId: null
    });

    expect(station.construction).toBe(construction);
    expect(station.construction.tileCount).toBe(2);
    expect(station.type).toBe('mining');
    expect(station.position).toEqual({ x: 100, y: -25 });
    expect(station.ownerId).toBeNull();
    expect(isStationType('factory')).toBe(true);
    expect(isStationType('ship')).toBe(false);
  });

  it('rejects empty constructions, mismatched IDs, and invalid transforms', () => {
    const empty = new Construction('empty-station');

    expect(
      () =>
        new Station({
          id: 'empty-station',
          type: 'research',
          construction: empty,
          position: { x: 0, y: 0 },
          rotation: 0,
          ownerId: null
        })
    ).toThrow('Station construction must contain at least one tile.');

    expect(
      () =>
        new Station({
          id: 'other-id',
          type: 'research',
          construction: createStationConstruction(),
          position: { x: 0, y: 0 },
          rotation: 0,
          ownerId: null
        })
    ).toThrow('Station ID must match its construction ID.');

    expect(
      () =>
        new Station({
          id: 'station-1',
          type: 'research',
          construction: createStationConstruction(),
          position: { x: Number.NaN, y: 0 },
          rotation: 0,
          ownerId: null
        })
    ).toThrow('Station transform values must be finite.');
  });
});
