import { describe, expect, it } from 'vitest';
import { DEFAULT_TILE_REGISTRY } from '../src/core/tiles';
import { Construction } from '../src/construction/construction';
import {
  deserializeConstruction,
  serializeConstruction
} from '../src/save/serialization';

describe('construction serialization', () => {
  it('preserves construction ID, tile IDs, damage, and negative coordinates', () => {
    const original = new Construction('saved-ship');
    const tile = original.placeTile({ x: -1, y: 32 }, 'hull');
    tile.hp = 63;
    original.placeTile({ x: 32, y: 32 }, 'reactor');

    const restored = deserializeConstruction(
      serializeConstruction(original),
      DEFAULT_TILE_REGISTRY
    );

    expect(restored.id).toBe(original.id);
    expect(restored.getTiles()).toEqual(original.getTiles());
    expect(restored.chunkCount).toBe(original.chunkCount);
  });

  it('rejects unsupported save versions and unknown tile types', () => {
    expect(() =>
      deserializeConstruction(
        '{"version":2,"id":"ship","tiles":[]}',
        DEFAULT_TILE_REGISTRY
      )
    ).toThrow('Unsupported construction save version: 2.');

    expect(() =>
      deserializeConstruction(
        '{"version":1,"id":"ship","tiles":[{"x":0,"y":0,"id":1,"type":"alien","hp":10}]}',
        DEFAULT_TILE_REGISTRY
      )
    ).toThrow('Unknown tile type: alien.');
  });

  it('rejects duplicate tile IDs and occupied positions', () => {
    const duplicateIds =
      '{"version":1,"id":"ship","tiles":[{"x":0,"y":0,"id":1,"type":"hull","hp":100},{"x":1,"y":0,"id":1,"type":"hull","hp":100}]}';
    const duplicatePositions =
      '{"version":1,"id":"ship","tiles":[{"x":0,"y":0,"id":1,"type":"hull","hp":100},{"x":0,"y":0,"id":2,"type":"hull","hp":100}]}';

    expect(() =>
      deserializeConstruction(duplicateIds, DEFAULT_TILE_REGISTRY)
    ).toThrow('Duplicate tile ID: 1.');
    expect(() =>
      deserializeConstruction(duplicatePositions, DEFAULT_TILE_REGISTRY)
    ).toThrow('A tile already exists at (0, 0).');
  });
});
