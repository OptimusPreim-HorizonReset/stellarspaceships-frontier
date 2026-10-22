import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../src/core/config';
import { Construction } from '../src/construction/construction';
import {
  deserializeConstruction,
  serializeConstruction
} from '../src/save/serialization';

describe('Gate A scalability profile', () => {
  it('round-trips 10,000 tiles across at least 100 chunks', () => {
    const construction = new Construction('gate-a-scale-test');

    for (let chunkY = 0; chunkY < 10; chunkY += 1) {
      for (let chunkX = 0; chunkX < 10; chunkX += 1) {
        for (let tileIndex = 0; tileIndex < 100; tileIndex += 1) {
          construction.placeTile(
            {
              x: chunkX * CHUNK_SIZE + (tileIndex % CHUNK_SIZE),
              y:
                chunkY * CHUNK_SIZE +
                Math.floor(tileIndex / CHUNK_SIZE)
            },
            'hull'
          );
        }
      }
    }

    expect(construction.tileCount).toBe(10_000);
    expect(construction.chunkCount).toBe(100);

    const restored = deserializeConstruction(
      serializeConstruction(construction),
      construction.tileRegistry
    );

    expect(restored.tileCount).toBe(10_000);
    expect(restored.chunkCount).toBe(100);
    expect(restored.getTiles()).toEqual(construction.getTiles());
  });
});
