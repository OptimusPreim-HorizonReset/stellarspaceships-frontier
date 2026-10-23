import { describe, expect, it } from 'vitest';
import { generateSector } from '../src/world/sectorGenerator';
import type { SectorGenerationProfile } from '../src/world/sectorGenerator';

const profile: SectorGenerationProfile = {
  rings: [
    { maximumDistance: 500, minimumAsteroids: 0, maximumAsteroids: 1 },
    { maximumDistance: 2000, minimumAsteroids: 2, maximumAsteroids: 4 },
    { maximumDistance: 3000, minimumAsteroids: 5, maximumAsteroids: 7 }
  ]
};

describe('ring-based sector generation', () => {
  it('generates deterministic sectors with ring-driven asteroid density', () => {
    const inner = generateSector(12345, { x: 2048, y: 2048 }, profile);
    const innerAgain = generateSector(12345, { x: 2048, y: 2048 }, profile);
    const outer = generateSector(12345, { x: 4095, y: 4095 }, profile);

    expect(inner).toEqual(innerAgain);
    expect(inner.objects.length).toBeGreaterThanOrEqual(0);
    expect(inner.objects.length).toBeLessThanOrEqual(1);
    expect(outer.objects.length).toBeGreaterThanOrEqual(5);
    expect(outer.objects.length).toBeLessThanOrEqual(7);
    expect(outer.seed).not.toBe(inner.seed);
    expect(outer.ownerId).toBeNull();
    expect(
      outer.objects.every(
        ({ localPosition }) =>
          localPosition.x >= 0 &&
          localPosition.x < 1 &&
          localPosition.y >= 0 &&
          localPosition.y < 1
      )
    ).toBe(true);
  });

  it('rejects invalid world seeds and ring rules', () => {
    expect(() =>
      generateSector(-1, { x: 0, y: 0 }, profile)
    ).toThrow('World seed must be an unsigned 32-bit integer.');
    expect(() =>
      generateSector(1, { x: 0, y: 0 }, {
        rings: [
          { maximumDistance: 10, minimumAsteroids: 3, maximumAsteroids: 1 }
        ]
      })
    ).toThrow('Invalid sector generation rule at ring 0.');
  });
});
