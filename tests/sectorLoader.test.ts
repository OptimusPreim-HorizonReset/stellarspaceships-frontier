import { describe, expect, it } from 'vitest';
import { SectorLoader } from '../src/world/sectorLoader';
import type { SectorGenerationProfile } from '../src/world/sectorGenerator';

const profile: SectorGenerationProfile = {
  rings: [
    { maximumDistance: 3000, minimumAsteroids: 1, maximumAsteroids: 2 }
  ]
};

describe('sector loader', () => {
  it('loads a deterministic 3x3 neighborhood and caches repeated requests', () => {
    const loader = new SectorLoader(123, profile, 0.01);

    const firstLoad = loader.loadNeighborhood({ x: 2000, y: 2000 });
    const repeatedLoad = loader.loadNeighborhood({ x: 2000, y: 2000 });

    expect(firstLoad).toHaveLength(9);
    expect(loader.loadedSectorCount).toBe(9);
    expect(repeatedLoad).toEqual(firstLoad);
    expect(repeatedLoad[0]).toBe(firstLoad[0]);
    expect(loader.getSector({ x: 2000, y: 2000 })).toBeDefined();
    expect(loader.getLoadedSectors()).toHaveLength(9);
  });

  it('clips neighborhoods at world edges and validates center coordinates', () => {
    const loader = new SectorLoader(1, profile, 0);

    expect(loader.loadNeighborhood({ x: 0, y: 0 })).toHaveLength(4);
    expect(loader.loadedSectorCount).toBe(4);
    expect(() =>
      loader.loadNeighborhood({ x: 4096, y: 0 })
    ).toThrow('Sector coordinates must be safe integers within 0..4095.');
  });

  it('loads the new neighborhood and returns stale sectors for persistence', () => {
    const loader = new SectorLoader(42, profile, 0.01);

    loader.loadNeighborhood({ x: 2000, y: 2000 });
    const update = loader.updateNeighborhood({ x: 2001, y: 2000 });

    expect(update.activeSectors).toHaveLength(9);
    expect(update.unloadedSectors).toHaveLength(3);
    expect(loader.loadedSectorCount).toBe(9);
    expect(loader.getSector({ x: 1999, y: 1999 })).toBeUndefined();
    expect(loader.getSector({ x: 2002, y: 1999 })).toBeDefined();
    expect(
      update.unloadedSectors.map((sector) => sector.position)
    ).toEqual([
      { x: 1999, y: 1999 },
      { x: 1999, y: 2000 },
      { x: 1999, y: 2001 }
    ]);
  });
});
