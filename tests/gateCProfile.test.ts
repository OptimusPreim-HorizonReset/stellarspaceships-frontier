import { describe, expect, it } from 'vitest';
import { createGateCCombatConstruction } from '../src/benchmark/gateCProfile';

describe('SF-191 combat workload', () => {
  it('creates exactly 3,000 tiles across four chunks with combat hardware', () => {
    const construction = createGateCCombatConstruction();
    const tiles = construction.getTiles();

    expect(construction.tileCount).toBe(3000);
    expect(construction.chunkCount).toBe(4);
    expect(tiles.filter(({ tile }) => tile.type === 'reactor')).toHaveLength(4);
    expect(tiles.filter(({ tile }) => tile.type === 'thruster')).toHaveLength(2);
  });
});
