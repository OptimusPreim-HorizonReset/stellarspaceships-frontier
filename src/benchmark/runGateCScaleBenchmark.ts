import { applyLocalDamage } from '../combat/damage';
import { findProjectileCollisionCandidates } from '../combat/broadphase';
import type { BroadphaseTarget } from '../combat/broadphase';
import { findProjectileImpacts } from '../combat/narrowphase';
import { advanceProjectiles, createProjectile } from '../combat/projectiles';
import type { TilePosition } from '../core/coordinates';
import { CanvasWorldRenderer, TILE_PIXEL_SIZE } from '../rendering/canvasWorldRenderer';
import { summarizeFrameIntervals } from './frameMetrics';
import {
  createBenchmarkProfilingReport,
  type BenchmarkProfilingReport
} from './profileReport';
import {
  collectBrowserFrames,
  percentile,
  readBrowserHeapSnapshot
} from './browserProfile';
import { createGateCCombatConstruction, GATE_C_SCALE_PROFILE } from './gateCProfile';

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

export interface GateCScaleBenchmarkReport {
  readonly schemaVersion: 1;
  readonly profile: 'SF-191';
  readonly generatedAt: string;
  readonly buildMode: string;
  readonly targetHardwareConfirmed: false;
  readonly environment: {
    readonly userAgent: string;
    readonly logicalProcessorCount: number;
    readonly devicePixelRatio: number;
    readonly canvasCssWidth: number;
    readonly canvasCssHeight: number;
    readonly canvasPixelWidth: number;
    readonly canvasPixelHeight: number;
  };
  readonly workload: {
    readonly requestedTileCount: number;
    readonly initialChunkCount: number;
    readonly finalTileCount: number;
    readonly finalChunkCount: number;
    readonly visibleTilesPerFrame: number;
    readonly visibleChunksPerFrame: number;
    readonly combatFrames: number;
  };
  readonly combat: {
    readonly projectileSteps: number;
    readonly broadphaseCandidates: number;
    readonly impacts: number;
    readonly damageEvents: number;
    readonly destroyedTiles: number;
  };
  readonly rendering: {
    readonly targetFps: number;
    readonly warmupFrames: number;
    readonly measuredFrames: number;
    readonly averageFps: number;
    readonly averageFrameIntervalMs: number;
    readonly p95FrameIntervalMs: number;
    readonly framesOverBudget: number;
    readonly averageFrameWorkMs: number;
    readonly p95FrameWorkMs: number;
    readonly averageFpsTargetMet: boolean;
  };
  readonly memory: {
    readonly processRamUsageAvailable: false;
    readonly browserHeapApiAvailable: boolean;
    readonly usedJSHeapBytesBefore: number | null;
    readonly usedJSHeapBytesAfter: number | null;
    readonly jsHeapDeltaBytes: number | null;
    readonly totalJSHeapBytesAfter: number | null;
    readonly jsHeapSizeLimitBytes: number | null;
  };
  readonly profilingCoverage: BenchmarkProfilingReport;
  readonly gateApproved: false;
}

export async function runGateCScaleBenchmark(
  canvas: HTMLCanvasElement,
  renderer: CanvasWorldRenderer,
  buildMode: string
): Promise<GateCScaleBenchmarkReport> {
  const heapBefore = readBrowserHeapSnapshot();
  const construction = createGateCCombatConstruction();
  const initialChunkCount = construction.chunkCount;
  const visibleColumns = Math.ceil(canvas.clientWidth / TILE_PIXEL_SIZE);
  const visibleRows = Math.ceil(canvas.clientHeight / TILE_PIXEL_SIZE);

  if (visibleColumns === 0 || visibleRows === 0) {
    throw new Error('SF-191 requires a visible, non-zero canvas.');
  }

  const visibleBounds = {
    minX: 0,
    minY: 0,
    maxXExclusive: visibleColumns,
    maxYExclusive: visibleRows
  };
  const visibleTilesPerFrame =
    construction.getTilesInBounds(visibleBounds).length;
  const visibleChunksPerFrame =
    construction.getChunkCountInBounds(visibleBounds);
  let combatFrames = 0;
  let projectileSteps = 0;
  let broadphaseCandidates = 0;
  let impactCount = 0;
  let damageEvents = 0;
  let destroyedTiles = 0;

  const samples = await collectBrowserFrames(
    () => {
      const row = combatFrames % GATE_C_SCALE_PROFILE.rows;
      const projectile = createProjectile({
        id: combatFrames + 1,
        ownerId: 'sf-191-attacker',
        position: { x: -2, y: row + 0.5 },
        direction: { x: 1, y: 0 },
        shooterVelocity: { x: 0, y: 0 },
        profile: {
          kind: 'cannon',
          speed: GATE_C_SCALE_PROFILE.projectileSpeed,
          damage: GATE_C_SCALE_PROFILE.projectileDamage,
          collisionRadius: GATE_C_SCALE_PROFILE.projectileRadius,
          lifetimeSeconds: 1
        }
      });
      const projectileAtEnd = advanceProjectiles([projectile], 1).expired[0];

      if (projectileAtEnd === undefined) {
        throw new Error('SF-191 projectile did not reach its step endpoint.');
      }

      const positionsByTargetId = new Map<string, TilePosition>();
      const targets: BroadphaseTarget[] = [];

      for (const { position, tile } of construction.iterateTiles()) {
        if (tile.hp === 0) {
          continue;
        }

        const id = `${construction.id}:tile:${tile.id}`;
        positionsByTargetId.set(id, position);
        targets.push({
          id,
          ownerId: construction.id,
          bounds: {
            minX: position.x,
            minY: position.y,
            maxX: position.x + 1,
            maxY: position.y + 1
          }
        });
      }

      const candidates = findProjectileCollisionCandidates(
        [projectileAtEnd],
        targets
      );
      broadphaseCandidates += candidates.length;
      projectileSteps += 1;
      const impact = findProjectileImpacts(candidates)[0];

      if (impact !== undefined) {
        impactCount += 1;
        const position = positionsByTargetId.get(impact.target.id);

        if (position === undefined) {
          throw new Error(`SF-191 target position missing: ${impact.target.id}.`);
        }

        const result = applyLocalDamage(
          construction,
          position,
          impact.projectile.damage
        );

        if (result.status !== 'miss') {
          damageEvents += 1;
        }

        if (result.status === 'destroyed') {
          destroyedTiles += 1;
        }
      }

      renderer.render(construction);
      combatFrames += 1;
    },
    GATE_C_SCALE_PROFILE.warmupFrames,
    GATE_C_SCALE_PROFILE.measuredFrames,
    GATE_C_SCALE_PROFILE.timeoutMs
  );

  const heapAfter = readBrowserHeapSnapshot();
  const frameMetrics = summarizeFrameIntervals(
    samples.intervalsMs,
    GATE_C_SCALE_PROFILE.targetFps
  );
  const averageFrameWorkMs =
    samples.workDurationsMs.reduce((sum, duration) => sum + duration, 0) /
    samples.workDurationsMs.length;
  const p95FrameWorkMs = percentile(samples.workDurationsMs, 0.95);
  const heapDelta =
    heapBefore.usedBytes === null || heapAfter.usedBytes === null
      ? null
      : heapAfter.usedBytes - heapBefore.usedBytes;

  return {
    schemaVersion: 1,
    profile: 'SF-191',
    generatedAt: new Date().toISOString(),
    buildMode,
    targetHardwareConfirmed: false,
    environment: {
      userAgent: navigator.userAgent,
      logicalProcessorCount: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio || 1,
      canvasCssWidth: canvas.clientWidth,
      canvasCssHeight: canvas.clientHeight,
      canvasPixelWidth: canvas.width,
      canvasPixelHeight: canvas.height
    },
    workload: {
      requestedTileCount: GATE_C_SCALE_PROFILE.tileCount,
      initialChunkCount,
      finalTileCount: construction.tileCount,
      finalChunkCount: construction.chunkCount,
      visibleTilesPerFrame,
      visibleChunksPerFrame,
      combatFrames
    },
    combat: {
      projectileSteps,
      broadphaseCandidates,
      impacts: impactCount,
      damageEvents,
      destroyedTiles
    },
    rendering: {
      targetFps: GATE_C_SCALE_PROFILE.targetFps,
      warmupFrames: GATE_C_SCALE_PROFILE.warmupFrames,
      measuredFrames: samples.intervalsMs.length,
      averageFps: rounded(frameMetrics.averageFps),
      averageFrameIntervalMs: rounded(
        frameMetrics.averageFrameIntervalMs
      ),
      p95FrameIntervalMs: rounded(frameMetrics.p95FrameIntervalMs),
      framesOverBudget: frameMetrics.framesOverBudget,
      averageFrameWorkMs: rounded(averageFrameWorkMs),
      p95FrameWorkMs: rounded(p95FrameWorkMs),
      averageFpsTargetMet: frameMetrics.meetsAverageFpsTarget
    },
    memory: {
      processRamUsageAvailable: false,
      browserHeapApiAvailable: heapBefore.supported && heapAfter.supported,
      usedJSHeapBytesBefore: heapBefore.usedBytes,
      usedJSHeapBytesAfter: heapAfter.usedBytes,
      jsHeapDeltaBytes: heapDelta,
      totalJSHeapBytesAfter: heapAfter.totalBytes,
      jsHeapSizeLimitBytes: heapAfter.limitBytes
    },
    profilingCoverage: createBenchmarkProfilingReport({
      javascriptFrameWorkMs: {
        averageMs: rounded(averageFrameWorkMs),
        p95Ms: rounded(p95FrameWorkMs)
      },
      heapBefore,
      heapAfter,
      totalChunks: construction.chunkCount,
      renderedChunksPerFrame: visibleChunksPerFrame,
      collision: {
        broadphaseCandidates,
        impacts: impactCount,
        damageEvents
      }
    }),
    gateApproved: false
  };
}
