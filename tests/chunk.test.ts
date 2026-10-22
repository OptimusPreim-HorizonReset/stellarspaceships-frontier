import { describe, expect, it } from 'vitest';
import { Chunk } from '../src/world/chunk';
import { DEFAULT_TILE_REGISTRY } from '../src/core/tiles';

describe('Chunk', () => {
  it('stores and removes tiles at local boundary coordinates', () => {
    const chunk = new Chunk({ x: 0, y: 0 });
    const definition = DEFAULT_TILE_REGISTRY.get('hull');

    if (definition === undefined) {
      throw new Error('Hull definition is missing.');
    }

    const tile = {
      id: 1,
      type: 'hull' as const,
      orientation: 'north' as const,
      hp: definition.maxHp,
      armor: definition.armor,
      mass: definition.mass
    };

    expect(chunk.setTile({ x: 31, y: 31 }, tile)).toBeUndefined();
    expect(chunk.tileCount).toBe(1);
    expect(chunk.getTile({ x: 31, y: 31 })).toEqual(tile);
    expect(chunk.removeTile({ x: 31, y: 31 })).toEqual(tile);
    expect(chunk.tileCount).toBe(0);
  });

  it('rejects local coordinates outside the chunk', () => {
    const chunk = new Chunk({ x: 0, y: 0 });

    expect(() => chunk.getTile({ x: 32, y: 0 })).toThrow(
      'Local tile coordinates are outside this chunk.'
    );
  });
});
