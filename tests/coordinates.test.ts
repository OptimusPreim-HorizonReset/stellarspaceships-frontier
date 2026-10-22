import { describe, expect, it } from 'vitest';
import {
  chunkPositionForTile,
  localPositionForTile
} from '../src/core/coordinates';

describe('chunk coordinates', () => {
  it('maps positive tile positions and exact boundaries', () => {
    expect(chunkPositionForTile({ x: 31, y: 32 })).toEqual({ x: 0, y: 1 });
    expect(localPositionForTile({ x: 31, y: 32 })).toEqual({ x: 31, y: 0 });
  });

  it('maps negative positions using floor-based division', () => {
    expect(chunkPositionForTile({ x: -1, y: -32 })).toEqual({
      x: -1,
      y: -1
    });
    expect(localPositionForTile({ x: -1, y: -32 })).toEqual({
      x: 31,
      y: 0
    });
  });

  it('rejects fractional coordinates and invalid chunk sizes', () => {
    expect(() => chunkPositionForTile({ x: 0.5, y: 0 })).toThrow(
      'Tile coordinates must be safe integers.'
    );
    expect(() => chunkPositionForTile({ x: 0, y: 0 }, 0)).toThrow(
      'Chunk size must be a positive safe integer.'
    );
  });
});
