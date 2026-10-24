import type { SectorPosition } from '../world/sector';
import {
  collectBrowserFrames,
  percentile,
  readBrowserHeapSnapshot
} from './browserProfile';
import { summarizeFrameIntervals } from './frameMetrics';
import {
  createBenchmarkProfilingReport,
  type BenchmarkProfilingReport
} from './profileReport';
import { GATE_D_PROFILE, GateDStreamingWorkload } from './gateDProfile';
import { CanvasSectorRenderer } from '../rendering/canvasSectorRenderer';
import {
  matchesTargetHardware,
  TARGET_HARDWARE_PROFILE
} from './targetHardware';
import type { TargetHardwareProfile } from './targetHardware';

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

export interface GateDBenchmarkReport {
  readonly schemaVersion: 1;
  readonly profile: 'GATE-D';
  readonly generatedAt: string;
  readonly buildMode: string;
  readonly targetHardwareConfirmed: boolean;
  readonly targetHardware: TargetHardwareProfile;
  readonly environment: {
    readonly userAgent: string;
    readonly logicalProcessorCount: number;
    readonly devicePixelRatio: number;
    readonly canvasCssWidth: number;
    readonly canvasCssHeight: number;
    readonly canvasPixelWidth: number;
    readonly canvasPixelHeight: number;
  };
  readonly setupMs: number;
  readonly streaming: {
    readonly startingCenter: SectorPosition;
    readonly finalCenter: SectorPosition;
    readonly sectorsPerNeighborhood: number;
    readonly sectorTransitions: number;
    readonly renderedSectorsPerFrame: number;
    readonly averageSectorObjectsRenderedPerFrame: number;
    readonly totalSectorsGenerated: number;
    readonly totalSectorsUnloaded: number;
    readonly maxLoadedSectors: number;
    readonly finalLoadedSectors: number;
    readonly maxActiveSectors: number;
    readonly finalActiveSectors: number;
    readonly cacheLimit: number;
    readonly cacheBoundMaintained: boolean;
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
    readonly usedJSHeapBytesAfterSetup: number | null;
    readonly usedJSHeapBytesAfterRender: number | null;
    readonly jsHeapDeltaBytes: number | null;
    readonly totalJSHeapBytesAfterRender: number | null;
    readonly jsHeapSizeLimitBytes: number | null;
  };
  readonly profilingCoverage: BenchmarkProfilingReport;
  readonly gateDApproved: false;
}

export async function runGateDBenchmark(
  canvas: HTMLCanvasElement,
  renderer: CanvasSectorRenderer,
  buildMode: string
): Promise<GateDBenchmarkReport> {
  const heapBefore = readBrowserHeapSnapshot();
  const setupStartedAt = performance.now();
  const streamingWorkload = new GateDStreamingWorkload();
  const heapAfterSetup = readBrowserHeapSnapshot();
  const setupMs = performance.now() - setupStartedAt;

  if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
    throw new Error('Gate D requires a visible, non-zero canvas.');
  }

  let totalRenderedSectors = 0;
  let totalRenderedObjects = 0;

  const samples = await collectBrowserFrames(
    () => {
      const step = streamingWorkload.advance();
      const rendered = renderer.renderNeighborhood(
        step.activeSectors,
        step.center
      );
      totalRenderedSectors += rendered.renderedSectors;
      totalRenderedObjects += rendered.renderedObjects;
    },
    GATE_D_PROFILE.warmupFrames,
    GATE_D_PROFILE.measuredFrames,
    GATE_D_PROFILE.timeoutMs
  );
  const heapAfterRender = readBrowserHeapSnapshot();
  const metrics = summarizeFrameIntervals(
    samples.intervalsMs,
    GATE_D_PROFILE.targetFps
  );
  const averageFrameWorkMs =
    samples.workDurationsMs.reduce((sum, duration) => sum + duration, 0) /
    samples.workDurationsMs.length;
  const p95FrameWorkMs = percentile(samples.workDurationsMs, 0.95);
  const heapDelta =
    heapBefore.usedBytes === null || heapAfterRender.usedBytes === null
      ? null
      : heapAfterRender.usedBytes - heapBefore.usedBytes;
  const streaming = streamingWorkload.metrics;
  const renderedSectorsPerFrame =
    totalRenderedSectors / streaming.sectorTransitions;
  const averageSectorObjectsRenderedPerFrame =
    totalRenderedObjects / streaming.sectorTransitions;

  return {
    schemaVersion: 1,
    profile: 'GATE-D',
    generatedAt: new Date().toISOString(),
    buildMode,
    targetHardwareConfirmed: matchesTargetHardware(
      navigator.userAgent,
      navigator.hardwareConcurrency
    ),
    targetHardware: TARGET_HARDWARE_PROFILE,
    environment: {
      userAgent: navigator.userAgent,
      logicalProcessorCount: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio || 1,
      canvasCssWidth: canvas.clientWidth,
      canvasCssHeight: canvas.clientHeight,
      canvasPixelWidth: canvas.width,
      canvasPixelHeight: canvas.height
    },
    setupMs: rounded(setupMs),
    streaming: {
      startingCenter: { ...GATE_D_PROFILE.startingCenter },
      finalCenter: streaming.finalCenter,
      sectorsPerNeighborhood: GATE_D_PROFILE.sectorsPerNeighborhood,
      sectorTransitions: streaming.sectorTransitions,
      renderedSectorsPerFrame: rounded(renderedSectorsPerFrame),
      averageSectorObjectsRenderedPerFrame: rounded(
        averageSectorObjectsRenderedPerFrame
      ),
      totalSectorsGenerated: streaming.totalSectorsGenerated,
      totalSectorsUnloaded: streaming.totalSectorsUnloaded,
      maxLoadedSectors: streaming.maxLoadedSectors,
      finalLoadedSectors: streaming.finalLoadedSectors,
      maxActiveSectors: streaming.maxActiveSectors,
      finalActiveSectors: streaming.finalActiveSectors,
      cacheLimit: streaming.cacheLimit,
      cacheBoundMaintained: streaming.cacheBoundMaintained
    },
    rendering: {
      targetFps: GATE_D_PROFILE.targetFps,
      warmupFrames: GATE_D_PROFILE.warmupFrames,
      measuredFrames: samples.intervalsMs.length,
      averageFps: rounded(metrics.averageFps),
      averageFrameIntervalMs: rounded(metrics.averageFrameIntervalMs),
      p95FrameIntervalMs: rounded(metrics.p95FrameIntervalMs),
      framesOverBudget: metrics.framesOverBudget,
      averageFrameWorkMs: rounded(averageFrameWorkMs),
      p95FrameWorkMs: rounded(p95FrameWorkMs),
      averageFpsTargetMet: metrics.meetsAverageFpsTarget
    },
    memory: {
      processRamUsageAvailable: false,
      browserHeapApiAvailable:
        heapBefore.supported &&
        heapAfterSetup.supported &&
        heapAfterRender.supported,
      usedJSHeapBytesBefore: heapBefore.usedBytes,
      usedJSHeapBytesAfterSetup: heapAfterSetup.usedBytes,
      usedJSHeapBytesAfterRender: heapAfterRender.usedBytes,
      jsHeapDeltaBytes: heapDelta,
      totalJSHeapBytesAfterRender: heapAfterRender.totalBytes,
      jsHeapSizeLimitBytes: heapAfterRender.limitBytes
    },
    profilingCoverage: createBenchmarkProfilingReport({
      javascriptFrameWorkMs: {
        averageMs: rounded(averageFrameWorkMs),
        p95Ms: rounded(p95FrameWorkMs)
      },
      heapBefore,
      heapAfter: heapAfterRender
    }),
    gateDApproved: false
  };
}
