import { describe, expect, it } from 'vitest';
import { activateChunkForEvent } from '../src/world/chunkActivity';
import { Construction } from '../src/construction/construction';

describe('event-driven chunk activation', () => {
  it('promotes nearby chunks and preserves combat priority', () => {
    const construction = new Construction('activity-events');
    construction.placeTile({ x: 0, y: 0 }, 'hull');

    expect(
      activateChunkForEvent(construction, { x: 0, y: 0 }, 'nearby')
    ).toBe('active');
    expect(
      activateChunkForEvent(construction, { x: 0, y: 0 }, 'combat')
    ).toBe('combat');
    expect(
      activateChunkForEvent(construction, { x: 0, y: 0 }, 'nearby')
    ).toBe('combat');
  });

  it('rejects events for missing chunks', () => {
    const construction = new Construction('missing-chunk');

    expect(() =>
      activateChunkForEvent(construction, { x: 0, y: 0 }, 'combat')
    ).toThrow('Chunk does not exist at (0, 0).');
  });
});
