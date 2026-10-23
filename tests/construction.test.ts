import { describe, expect, it } from 'vitest';
import { Construction } from '../src/construction/construction';

describe('Construction', () => {
  it('places, replaces, and removes tiles without losing chunk counts', () => {
    const construction = new Construction('test-ship');

    const firstTile = construction.placeTile({ x: 0, y: 0 }, 'hull');
    expect(construction.tileCount).toBe(1);
    expect(construction.chunkCount).toBe(1);

    const replacement = construction.placeTile({ x: 0, y: 0 }, 'armor');
    expect(replacement.id).toBeGreaterThan(firstTile.id);
    expect(construction.tileCount).toBe(1);
    expect(construction.getTile({ x: 0, y: 0 })?.type).toBe('armor');

    expect(construction.removeTile({ x: 0, y: 0 })?.id).toBe(replacement.id);
    expect(construction.tileCount).toBe(0);
    expect(construction.chunkCount).toBe(0);
  });

  it('finds connectivity across chunk boundaries but not diagonals', () => {
    const construction = new Construction('connected-ship');

    construction.placeTile({ x: 31, y: 0 }, 'hull');
    construction.placeTile({ x: 32, y: 0 }, 'hull');
    construction.placeTile({ x: 40, y: 10 }, 'hull');

    expect(construction.getConnectedComponents()).toHaveLength(2);
  });

  it('returns only tiles inside half-open bounds across chunk edges', () => {
    const construction = new Construction('visible-tiles');
    construction.placeTile({ x: -1, y: 0 }, 'hull');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    construction.placeTile({ x: 31, y: 0 }, 'armor');
    construction.placeTile({ x: 32, y: 0 }, 'reactor');
    construction.placeTile({ x: 40, y: 2 }, 'storage');

    const visibleTiles = construction.getTilesInBounds({
      minX: 0,
      minY: 0,
      maxXExclusive: 32,
      maxYExclusive: 1
    });

    expect(
      construction.getChunkCountInBounds({
        minX: 0,
        minY: 0,
        maxXExclusive: 32,
        maxYExclusive: 1
      })
    ).toBe(1);
    expect(visibleTiles.map(({ position }) => position)).toEqual([
      { x: 0, y: 0 },
      { x: 31, y: 0 }
    ]);
  });

  it('gets and sets runtime state for existing chunks only', () => {
    const construction = new Construction('active-chunks');
    construction.placeTile({ x: 32, y: -1 }, 'hull');

    expect(construction.getChunkState({ x: 1, y: -1 })).toBe('dormant');
    expect(construction.getChunkState({ x: 0, y: 0 })).toBeUndefined();

    construction.setChunkState({ x: 1, y: -1 }, 'combat');
    expect(construction.getChunkState({ x: 1, y: -1 })).toBe('combat');
    expect(() =>
      construction.setChunkState({ x: 0, y: 0 }, 'active')
    ).toThrow('Chunk does not exist at (0, 0).');
  });

  it('creates separate constructions for disconnected components', () => {
    const construction = new Construction('fragmenting-ship');
    construction.placeTile({ x: -1, y: 0 }, 'hull');
    construction.placeTile({ x: 10, y: 10 }, 'reactor');
    construction.placeTile({ x: 11, y: 10 }, 'battery');

    const fragments = construction.splitDisconnected(
      (sourceId, index) => `${sourceId}-${index + 1}`
    );

    expect(fragments.map((fragment) => fragment.id)).toEqual([
      'fragmenting-ship-1',
      'fragmenting-ship-2'
    ]);
    expect(fragments.map((fragment) => fragment.tileCount)).toEqual([1, 2]);
    expect(fragments.reduce((total, fragment) => total + fragment.tileCount, 0))
      .toBe(construction.tileCount);
    expect(construction.tileCount).toBe(3);
  });

  it('preserves runtime chunk states when splitting fragments', () => {
    const construction = new Construction('stateful-ship');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    construction.placeTile({ x: 33, y: 0 }, 'reactor');
    construction.setChunkState({ x: 0, y: 0 }, 'active');
    construction.setChunkState({ x: 1, y: 0 }, 'combat');

    const fragments = construction.splitDisconnected(
      (sourceId, index) => `${sourceId}-${index + 1}`
    );

    expect(fragments[0]?.getChunkState({ x: 0, y: 0 })).toBe('active');
    expect(fragments[1]?.getChunkState({ x: 1, y: 0 })).toBe('combat');
  });

  it('rejects duplicate fragment IDs', () => {
    const construction = new Construction('ship');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    construction.placeTile({ x: 5, y: 5 }, 'hull');

    expect(() => construction.splitDisconnected(() => 'fragment')).toThrow(
      'Fragment ID must be unique: fragment.'
    );
  });
});
