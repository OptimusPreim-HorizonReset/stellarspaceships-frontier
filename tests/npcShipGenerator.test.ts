import { describe, expect, it } from 'vitest';
import { serializeConstruction } from '../src/save/serialization';
import {
  generateNpcShip,
  MAX_NPC_SHIP_TILES,
  MAX_NPC_TECHNOLOGY_LEVEL
} from '../src/ai/npcShipGenerator';

describe('NPC ship generator', () => {
  it('reproducibly builds connected ships that honor the tile budget', () => {
    const definition = {
      id: 'npc-pirate-1',
      seed: 123_456,
      tileBudget: 64,
      technologyLevel: 3,
      doctrine: 'aggressive' as const
    };
    const first = generateNpcShip(definition);
    const second = generateNpcShip(definition);

    expect(first.construction.tileCount).toBe(definition.tileBudget);
    expect(first.construction.getConnectedComponents()).toHaveLength(1);
    expect(serializeConstruction(first.construction)).toBe(
      serializeConstruction(second.construction)
    );
    expect(first.tileCounts).toEqual(second.tileCounts);
    expect(first.tileCounts.rock).toBeUndefined();
  });

  it('uses doctrine signatures and technology levels in the generated layout', () => {
    const generateAtDoctrine = (
      doctrine: 'aggressive' | 'defensive' | 'trader' | 'scout'
    ) =>
      generateNpcShip({
        id: `npc-${doctrine}`,
        seed: 7,
        tileBudget: 6,
        technologyLevel: 2,
        doctrine
      });
    const signaturePosition = { x: 2, y: 1 };

    expect(
      generateAtDoctrine('aggressive').construction.getTile(signaturePosition)
        ?.type
    ).toBe('thruster');
    expect(
      generateAtDoctrine('defensive').construction.getTile(signaturePosition)
        ?.type
    ).toBe('armor');
    expect(
      generateAtDoctrine('trader').construction.getTile(signaturePosition)
        ?.type
    ).toBe('storage');
    expect(
      generateAtDoctrine('scout').construction.getTile(signaturePosition)
        ?.type
    ).toBe('battery');

    const basic = generateNpcShip({
      id: 'npc-basic-tech',
      seed: 7,
      tileBudget: 8,
      technologyLevel: 0,
      doctrine: 'scout'
    });
    const advanced = generateNpcShip({
      id: 'npc-advanced-tech',
      seed: 7,
      tileBudget: 8,
      technologyLevel: 2,
      doctrine: 'scout'
    });

    expect(basic.tileCounts.armor).toBeUndefined();
    expect(basic.tileCounts.battery).toBeUndefined();
    expect(advanced.tileCounts.armor).toBeGreaterThan(0);
    expect(advanced.tileCounts.battery).toBeGreaterThan(0);
  });

  it('rejects invalid seeds, budgets, technology levels, and doctrines', () => {
    const valid = {
      id: 'npc-valid',
      seed: 1,
      tileBudget: 10,
      technologyLevel: 1,
      doctrine: 'scout' as const
    };

    expect(() =>
      generateNpcShip({ ...valid, seed: -1 })
    ).toThrow('NPC ship seed must be an unsigned 32-bit integer.');
    expect(() =>
      generateNpcShip({ ...valid, tileBudget: 0 })
    ).toThrow(
      `NPC tile budget must be a positive integer up to ${MAX_NPC_SHIP_TILES}.`
    );
    expect(() =>
      generateNpcShip({
        ...valid,
        technologyLevel: MAX_NPC_TECHNOLOGY_LEVEL + 1
      })
    ).toThrow(
      `NPC technology level must be an integer within 0..${MAX_NPC_TECHNOLOGY_LEVEL}.`
    );
    expect(() =>
      generateNpcShip({ ...valid, doctrine: 'unknown' as never })
    ).toThrow('Unknown NPC ship doctrine: unknown.');
  });
});
