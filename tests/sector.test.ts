import { describe, expect, it } from 'vitest';
import {
  createSector,
  MAX_SECTOR_SEED,
  WORLD_SECTOR_COUNT
} from '../src/world/sector';

describe('sector data model', () => {
  it('creates an immutable sector at the world boundary', () => {
    const objects = [
      {
        id: 'asteroid-1',
        type: 'asteroid',
        localPosition: { x: 0.25, y: 0.5 }
      },
      {
        id: 'station-1',
        type: 'station',
        localPosition: { x: 0.75, y: 0.25 }
      }
    ];
    const sector = createSector({
      position: {
        x: WORLD_SECTOR_COUNT - 1,
        y: WORLD_SECTOR_COUNT - 1
      },
      seed: MAX_SECTOR_SEED,
      difficulty: 3.5,
      objects,
      ownerId: null
    });

    objects[0] = {
      id: 'changed',
      type: 'changed',
      localPosition: { x: 0.5, y: 0.5 }
    };

    expect(sector).toEqual({
      position: { x: 4095, y: 4095 },
      seed: MAX_SECTOR_SEED,
      difficulty: 3.5,
      objects: [
        {
          id: 'asteroid-1',
          type: 'asteroid',
          localPosition: { x: 0.25, y: 0.5 }
        },
        {
          id: 'station-1',
          type: 'station',
          localPosition: { x: 0.75, y: 0.25 }
        }
      ],
      ownerId: null
    });
    expect(Object.isFrozen(sector)).toBe(true);
    expect(Object.isFrozen(sector.position)).toBe(true);
    expect(Object.isFrozen(sector.objects)).toBe(true);
    expect(Object.isFrozen(sector.objects[0])).toBe(true);
  });

  it('validates coordinates, seeds, difficulty, ownership, and object IDs', () => {
    const validDefinition = {
      position: { x: 0, y: 0 },
      seed: 1,
      difficulty: 0,
      objects: []
    };

    expect(() =>
      createSector({
        ...validDefinition,
        position: { x: WORLD_SECTOR_COUNT, y: 0 }
      })
    ).toThrow('Sector coordinates must be safe integers');
    expect(() =>
      createSector({ ...validDefinition, seed: MAX_SECTOR_SEED + 1 })
    ).toThrow('Sector seed must be an unsigned 32-bit integer.');
    expect(() =>
      createSector({ ...validDefinition, difficulty: Number.NaN })
    ).toThrow('Sector difficulty must be finite and non-negative.');
    expect(() =>
      createSector({ ...validDefinition, ownerId: '  ' })
    ).toThrow('Sector owner ID must not be empty.');
    expect(() =>
      createSector({
        ...validDefinition,
        objects: [
          {
            id: 'asteroid-1',
            type: 'asteroid',
            localPosition: { x: 0.1, y: 0.2 }
          },
          {
            id: 'asteroid-1',
            type: 'station',
            localPosition: { x: 0.3, y: 0.4 }
          }
        ]
      })
    ).toThrow('Duplicate sector object ID: asteroid-1.');
  });
});
