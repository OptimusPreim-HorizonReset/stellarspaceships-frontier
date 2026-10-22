import { describe, expect, it } from 'vitest';
import {
  createGateAConstruction,
  GATE_A_PROFILE
} from '../src/benchmark/gateAProfile';
import {
  deserializeConstruction,
  serializeConstruction
} from '../src/save/serialization';

describe('Gate A scalability profile', () => {
  it('round-trips 10,000 tiles across at least 100 chunks', () => {
    const construction = createGateAConstruction();

    expect(construction.tileCount).toBe(GATE_A_PROFILE.tileCount);
    expect(construction.chunkCount).toBe(GATE_A_PROFILE.chunkCount);

    const restored = deserializeConstruction(
      serializeConstruction(construction),
      construction.tileRegistry
    );

    expect(restored.tileCount).toBe(GATE_A_PROFILE.tileCount);
    expect(restored.chunkCount).toBe(GATE_A_PROFILE.chunkCount);
    expect(restored.getTiles()).toEqual(construction.getTiles());
  });
});
