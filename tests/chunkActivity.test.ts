import { describe, expect, it } from 'vitest';
import {
  activateChunkForEvent,
  advanceChunkActivity
} from '../src/world/chunkActivity';
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

  it('deactivates combat and active states using elapsed simulation time', () => {
    const construction = new Construction('timed-chunks');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    const timeouts = { activeSeconds: 3, combatSeconds: 2 };

    activateChunkForEvent(construction, { x: 0, y: 0 }, 'combat');
    expect(advanceChunkActivity(construction, 1, timeouts)).toEqual([]);
    expect(construction.getChunkState({ x: 0, y: 0 })).toBe('combat');

    expect(advanceChunkActivity(construction, 1, timeouts)).toEqual([
      { position: { x: 0, y: 0 }, from: 'combat', to: 'active' }
    ]);
    expect(construction.getChunkState({ x: 0, y: 0 })).toBe('active');

    expect(advanceChunkActivity(construction, 3, timeouts)).toEqual([
      { position: { x: 0, y: 0 }, from: 'active', to: 'dormant' }
    ]);
    expect(construction.getChunkState({ x: 0, y: 0 })).toBe('dormant');
  });

  it('preserves timeout overflow and orders transitions by chunk coordinates', () => {
    const construction = new Construction('large-time-step');
    construction.placeTile({ x: 32, y: 0 }, 'hull');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    activateChunkForEvent(construction, { x: 1, y: 0 }, 'combat');
    activateChunkForEvent(construction, { x: 0, y: 0 }, 'combat');

    expect(
      advanceChunkActivity(construction, 10, {
        activeSeconds: 3,
        combatSeconds: 2
      })
    ).toEqual([
      { position: { x: 0, y: 0 }, from: 'combat', to: 'active' },
      { position: { x: 0, y: 0 }, from: 'active', to: 'dormant' },
      { position: { x: 1, y: 0 }, from: 'combat', to: 'active' },
      { position: { x: 1, y: 0 }, from: 'active', to: 'dormant' }
    ]);
  });

  it('refreshes timeouts on activity and rejects invalid time values', () => {
    const construction = new Construction('refreshed-chunk');
    construction.placeTile({ x: 0, y: 0 }, 'hull');
    const timeouts = { activeSeconds: 3, combatSeconds: 2 };

    activateChunkForEvent(construction, { x: 0, y: 0 }, 'nearby');
    expect(advanceChunkActivity(construction, 2, timeouts)).toEqual([]);
    activateChunkForEvent(construction, { x: 0, y: 0 }, 'nearby');
    expect(advanceChunkActivity(construction, 2, timeouts)).toEqual([]);
    expect(advanceChunkActivity(construction, 1, timeouts)).toEqual([
      { position: { x: 0, y: 0 }, from: 'active', to: 'dormant' }
    ]);
    expect(() =>
      advanceChunkActivity(construction, -1, timeouts)
    ).toThrow('Chunk activity delta time must be finite and non-negative.');
    expect(() =>
      advanceChunkActivity(construction, 1, {
        activeSeconds: 0,
        combatSeconds: 2
      })
    ).toThrow('Chunk activity timeouts must be finite and positive.');
  });
});
