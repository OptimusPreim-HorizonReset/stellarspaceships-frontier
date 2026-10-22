import { CHUNK_SIZE } from '../core/config';
import { Construction } from '../construction/construction';

export const GATE_A_PROFILE = Object.freeze({
  tileCount: 10_000,
  chunkCount: 100,
  chunksPerAxis: 10,
  tilesPerChunk: 100,
  targetFps: 60,
  warmupFrames: 30,
  measuredFrames: 180,
  timeoutMs: 15_000
});

export function createGateAConstruction(): Construction {
  const construction = new Construction('gate-a-benchmark');

  for (let chunkY = 0; chunkY < GATE_A_PROFILE.chunksPerAxis; chunkY += 1) {
    for (let chunkX = 0; chunkX < GATE_A_PROFILE.chunksPerAxis; chunkX += 1) {
      for (
        let tileIndex = 0;
        tileIndex < GATE_A_PROFILE.tilesPerChunk;
        tileIndex += 1
      ) {
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

  if (
    construction.tileCount !== GATE_A_PROFILE.tileCount ||
    construction.chunkCount !== GATE_A_PROFILE.chunkCount
  ) {
    throw new Error('Gate A workload does not match its defined profile.');
  }

  return construction;
}
