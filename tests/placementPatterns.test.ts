import { describe, expect, it } from 'vitest';
import { getPlacementPositions } from '../src/editor/placementPatterns';

describe('editor placement patterns', () => {
  it('creates a four-connected line with inclusive endpoints', () => {
    const positions = getPlacementPositions(
      { x: 0, y: 0 },
      { x: 3, y: 2 },
      'line'
    );

    expect(positions).toHaveLength(6);
    expect(positions[0]).toEqual({ x: 0, y: 0 });
    expect(positions.at(-1)).toEqual({ x: 3, y: 2 });

    for (let index = 1; index < positions.length; index += 1) {
      const previous = positions[index - 1];
      const current = positions[index];

      if (previous === undefined || current === undefined) {
        throw new Error('Line pattern contains an invalid position.');
      }

      expect(
        Math.abs(current.x - previous.x) +
          Math.abs(current.y - previous.y)
      ).toBe(1);
    }
  });

  it('creates a filled rectangle from either drag direction', () => {
    expect(
      getPlacementPositions(
        { x: 3, y: 2 },
        { x: 1, y: 1 },
        'rectangle'
      )
    ).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 }
    ]);
  });

  it('rejects invalid coordinates', () => {
    expect(() =>
      getPlacementPositions({ x: 1.5, y: 0 }, { x: 2, y: 0 }, 'line')
    ).toThrow('Placement coordinates must be safe integers.');
  });
});
