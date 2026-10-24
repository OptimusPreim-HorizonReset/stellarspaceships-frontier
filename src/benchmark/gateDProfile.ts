import { sectorKey, WORLD_SECTOR_COUNT } from '../world/sector';
import type { SectorPosition } from '../world/sector';
import type { Sector } from '../world/sector';
import { SectorLoader } from '../world/sectorLoader';

export const GATE_D_PROFILE = Object.freeze({
  worldSeed: 0x5f3759df,
  startingCenter: Object.freeze({ x: 2048, y: 2048 }),
  sectorsPerNeighborhood: 9,
  maximumLoadedSectors: 9,
  targetFps: 60,
  warmupFrames: 30,
  measuredFrames: 180,
  timeoutMs: 15_000,
  difficultyModifier: 0.01,
  generationProfile: Object.freeze({
    rings: Object.freeze([
      Object.freeze({
        maximumDistance: 4000,
        minimumAsteroids: 2,
        maximumAsteroids: 5
      })
    ])
  })
});

export interface GateDStreamingStep {
  readonly activeSectors: readonly Sector[];
  readonly center: SectorPosition;
  readonly activeSectorCount: number;
  readonly newlyGeneratedSectorCount: number;
  readonly unloadedSectorCount: number;
  readonly loadedSectorCount: number;
}

export interface GateDStreamingMetrics {
  readonly sectorTransitions: number;
  readonly totalSectorsGenerated: number;
  readonly totalSectorsUnloaded: number;
  readonly maxLoadedSectors: number;
  readonly finalLoadedSectors: number;
  readonly maxActiveSectors: number;
  readonly finalActiveSectors: number;
  readonly cacheLimit: number;
  readonly cacheBoundMaintained: boolean;
  readonly finalCenter: SectorPosition;
}

export class GateDStreamingWorkload {
  private readonly loader = new SectorLoader(
    GATE_D_PROFILE.worldSeed,
    GATE_D_PROFILE.generationProfile,
    GATE_D_PROFILE.difficultyModifier
  );
  private activeSectorKeys = new Set<string>();
  private center: SectorPosition = { ...GATE_D_PROFILE.startingCenter };
  private horizontalDirection: 1 | -1 = 1;
  private sectorTransitions = 0;
  private totalSectorsGenerated: number;
  private totalSectorsUnloaded = 0;
  private maxLoadedSectors: number;
  private maxActiveSectors: number;
  private activeSectors = 0;

  constructor() {
    const initialSectors = this.loader.loadNeighborhood(this.center);

    if (initialSectors.length !== GATE_D_PROFILE.sectorsPerNeighborhood) {
      throw new Error('Gate D did not load its initial 3x3 sector neighborhood.');
    }

    this.activeSectorKeys = new Set(
      initialSectors.map((sector) => sectorKey(sector.position))
    );
    this.totalSectorsGenerated = initialSectors.length;
    this.activeSectors = initialSectors.length;
    this.maxLoadedSectors = this.loader.loadedSectorCount;
    this.maxActiveSectors = initialSectors.length;
    this.assertCacheBound();
  }

  advance(): GateDStreamingStep {
    if (this.center.x >= WORLD_SECTOR_COUNT - 2) {
      this.horizontalDirection = -1;
    } else if (this.center.x <= 1) {
      this.horizontalDirection = 1;
    }

    this.center = {
      x: this.center.x + this.horizontalDirection,
      y: this.center.y
    };

    const previousSectorKeys = this.activeSectorKeys;
    const update = this.loader.updateNeighborhood(this.center);
    const newlyGeneratedSectorCount = update.activeSectors.filter(
      (sector) => !previousSectorKeys.has(sectorKey(sector.position))
    ).length;

    if (
      update.activeSectors.length !== GATE_D_PROFILE.sectorsPerNeighborhood ||
      update.unloadedSectors.length !== 3 ||
      newlyGeneratedSectorCount !== 3
    ) {
      throw new Error('Gate D sector transition did not replace one full column.');
    }

    this.activeSectorKeys = new Set(
      update.activeSectors.map((sector) => sectorKey(sector.position))
    );
    this.activeSectors = update.activeSectors.length;
    this.sectorTransitions += 1;
    this.totalSectorsGenerated += newlyGeneratedSectorCount;
    this.totalSectorsUnloaded += update.unloadedSectors.length;
    this.maxLoadedSectors = Math.max(
      this.maxLoadedSectors,
      this.loader.loadedSectorCount
    );
    this.maxActiveSectors = Math.max(
      this.maxActiveSectors,
      this.activeSectors
    );
    this.assertCacheBound();

    return {
      activeSectors: update.activeSectors,
      center: { ...this.center },
      activeSectorCount: update.activeSectors.length,
      newlyGeneratedSectorCount,
      unloadedSectorCount: update.unloadedSectors.length,
      loadedSectorCount: this.loader.loadedSectorCount
    };
  }

  get metrics(): GateDStreamingMetrics {
    return {
      sectorTransitions: this.sectorTransitions,
      totalSectorsGenerated: this.totalSectorsGenerated,
      totalSectorsUnloaded: this.totalSectorsUnloaded,
      maxLoadedSectors: this.maxLoadedSectors,
      finalLoadedSectors: this.loader.loadedSectorCount,
      maxActiveSectors: this.maxActiveSectors,
      finalActiveSectors: this.activeSectors,
      cacheLimit: GATE_D_PROFILE.maximumLoadedSectors,
      cacheBoundMaintained:
        this.maxLoadedSectors <= GATE_D_PROFILE.maximumLoadedSectors,
      finalCenter: { ...this.center }
    };
  }

  private assertCacheBound(): void {
    if (this.loader.loadedSectorCount > GATE_D_PROFILE.maximumLoadedSectors) {
      throw new Error('Gate D exceeded its 3x3 loaded-sector cache bound.');
    }
  }
}
