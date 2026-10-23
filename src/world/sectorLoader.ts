import { applyDistanceDifficulty } from './sectorDifficulty';
import { deriveSectorSeed, generateSector } from './sectorGenerator';
import type { SectorGenerationProfile } from './sectorGenerator';
import {
  assertValidSectorPosition,
  sectorKey,
  WORLD_SECTOR_COUNT
} from './sector';
import type { Sector, SectorPosition } from './sector';

export interface SectorNeighborhoodUpdate {
  readonly activeSectors: readonly Sector[];
  readonly unloadedSectors: readonly Sector[];
}

export class SectorLoader {
  private readonly loadedSectors = new Map<string, Sector>();
  private readonly generationProfile: SectorGenerationProfile;

  constructor(
    private readonly worldSeed: number,
    generationProfile: SectorGenerationProfile,
    private readonly difficultyModifier: number
  ) {
    deriveSectorSeed(worldSeed, { x: 0, y: 0 });
    this.generationProfile = Object.freeze({
      rings: Object.freeze(
        generationProfile.rings.map((ring) => Object.freeze({ ...ring }))
      )
    });
  }

  get loadedSectorCount(): number {
    return this.loadedSectors.size;
  }

  getSector(position: SectorPosition): Sector | undefined {
    return this.loadedSectors.get(sectorKey(position));
  }

  getLoadedSectors(): readonly Sector[] {
    return Object.freeze(
      Array.from(this.loadedSectors.values()).sort(
        (left, right) =>
          left.position.y - right.position.y ||
          left.position.x - right.position.x
      )
    );
  }

  loadNeighborhood(center: SectorPosition): readonly Sector[] {
    assertValidSectorPosition(center);

    const loaded: Sector[] = [];
    const minX = Math.max(0, center.x - 1);
    const maxX = Math.min(WORLD_SECTOR_COUNT - 1, center.x + 1);
    const minY = Math.max(0, center.y - 1);
    const maxY = Math.min(WORLD_SECTOR_COUNT - 1, center.y + 1);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        loaded.push(this.loadSector({ x, y }));
      }
    }

    return Object.freeze(loaded);
  }

  updateNeighborhood(center: SectorPosition): SectorNeighborhoodUpdate {
    const activeSectors = this.loadNeighborhood(center);
    const activeKeys = new Set(
      activeSectors.map((sector) => sectorKey(sector.position))
    );
    const unloadedSectors: Sector[] = [];

    for (const sector of this.getLoadedSectors()) {
      const key = sectorKey(sector.position);

      if (!activeKeys.has(key)) {
        this.loadedSectors.delete(key);
        unloadedSectors.push(sector);
      }
    }

    return {
      activeSectors,
      unloadedSectors: Object.freeze(unloadedSectors)
    };
  }

  private loadSector(position: SectorPosition): Sector {
    const key = sectorKey(position);
    const existing = this.loadedSectors.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const generated = generateSector(
      this.worldSeed,
      position,
      this.generationProfile
    );
    const sector = applyDistanceDifficulty(
      generated,
      this.difficultyModifier
    );
    this.loadedSectors.set(key, sector);
    return sector;
  }
}
