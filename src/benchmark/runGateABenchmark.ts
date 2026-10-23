import {
  createGateAConstruction,
  GATE_A_PROFILE
} from './gateAProfile';
import {
  collectBrowserFrames,
  percentile,
  readBrowserHeapSnapshot
} from './browserProfile';
import type { BrowserFrameSamples } from './browserProfile';
import { summarizeFrameIntervals } from './frameMetrics';
import { deserializeConstruction, serializeConstruction } from '../save/serialization';
import {
  CanvasWorldRenderer,
  TILE_PIXEL_SIZE
} from '../rendering/canvasWorldRenderer';

export interface GateABenchmarkReport {
  readonly schemaVersion: 1;
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
    readonly tileCount: number;
    readonly chunkCount: number;
    readonly visibleTilesPerFrame: number;
    readonly visibleChunksPerFrame: number;
    readonly serializedBytes: number;
  };
  readonly persistence: {
    readonly serializeMs: number;
    readonly deserializeMs: number;
    readonly roundTripVerified: boolean;
  };
  readonly rendering: {
    readonly targetFps: number;
    readonly measuredFrames: number;
    readonly averageFps: number;
    readonly averageFrameIntervalMs: number;
    readonly p95FrameIntervalMs: number;
    readonly framesOverBudget: number;
    readonly averageRenderMs: number;
    readonly p95RenderMs: number;
    readonly averageFpsTargetMet: boolean;
  };
  readonly profiling: {
    readonly cpu: {
      readonly systemCpuPercentAvailable: false;
      readonly systemCpuPercent: null;
      readonly averageJavaScriptRenderMs: number;
      readonly p95JavaScriptRenderMs: number;
    };
    readonly memory: {
      readonly processRamUsageAvailable: false;
      readonly browserHeapApiAvailable: boolean;
      readonly usedJSHeapBytesBefore: number | null;
      readonly usedJSHeapBytesAfterRoundTrip: number | null;
      readonly usedJSHeapBytesAfterRender: number | null;
      readonly totalJSHeapBytesAfterRender: number | null;
      readonly jsHeapSizeLimitBytes: number | null;
    };
    readonly chunks: {
      readonly totalChunks: number;
      readonly renderedChunksPerFrame: number;
      readonly simulationStatesAvailable: false;
    };
    readonly physics: {
      readonly status: 'not-implemented';
    };
    readonly collision: {
      readonly status: 'not-implemented';
    };
  };
  readonly gateAApproved: false;
}

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

function collectFrames(
  renderer: CanvasWorldRenderer
): Promise<BrowserFrameSamples> {
  const construction = createGateAConstruction();
  return collectBrowserFrames(
    () => renderer.render(construction),
    GATE_A_PROFILE.warmupFrames,
    GATE_A_PROFILE.measuredFrames,
    GATE_A_PROFILE.timeoutMs
  );
}

export async function runGateABenchmark(
  canvas: HTMLCanvasElement,
  renderer: CanvasWorldRenderer,
  buildMode: string
): Promise<GateABenchmarkReport> {
  const heapBefore = readBrowserHeapSnapshot();
  const construction = createGateAConstruction();

  const serializeStartedAt = performance.now();
  const serialized = serializeConstruction(construction);
  const serializeMs = performance.now() - serializeStartedAt;

  const deserializeStartedAt = performance.now();
  const restored = deserializeConstruction(
    serialized,
    construction.tileRegistry
  );
  const deserializeMs = performance.now() - deserializeStartedAt;
  const roundTripVerified =
    serializeConstruction(restored) === serialized &&
    restored.tileCount === GATE_A_PROFILE.tileCount &&
    restored.chunkCount === GATE_A_PROFILE.chunkCount;

  if (!roundTripVerified) {
    throw new Error('Gate A save/load round-trip did not preserve the workload.');
  }

  const heapAfterRoundTrip = readBrowserHeapSnapshot();
  const visibleColumns = Math.ceil(canvas.clientWidth / TILE_PIXEL_SIZE);
  const visibleRows = Math.ceil(canvas.clientHeight / TILE_PIXEL_SIZE);

  if (visibleColumns === 0 || visibleRows === 0) {
    throw new Error('Gate A requires a visible, non-zero canvas.');
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
  const samples = await collectFrames(renderer);
  const heapAfterRendering = readBrowserHeapSnapshot();
  const frameMetrics = summarizeFrameIntervals(
    samples.intervalsMs,
    GATE_A_PROFILE.targetFps
  );
  const averageRenderMs =
    samples.workDurationsMs.reduce((sum, duration) => sum + duration, 0) /
    samples.workDurationsMs.length;
  const p95RenderMs = percentile(samples.workDurationsMs, 0.95);

  return {
    schemaVersion: 1,
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
      tileCount: construction.tileCount,
      chunkCount: construction.chunkCount,
      visibleTilesPerFrame,
      visibleChunksPerFrame,
      serializedBytes: new TextEncoder().encode(serialized).byteLength
    },
    persistence: {
      serializeMs: rounded(serializeMs),
      deserializeMs: rounded(deserializeMs),
      roundTripVerified
    },
    rendering: {
      targetFps: GATE_A_PROFILE.targetFps,
      measuredFrames: samples.intervalsMs.length,
      averageFps: rounded(frameMetrics.averageFps),
      averageFrameIntervalMs: rounded(
        frameMetrics.averageFrameIntervalMs
      ),
      p95FrameIntervalMs: rounded(frameMetrics.p95FrameIntervalMs),
      framesOverBudget: frameMetrics.framesOverBudget,
      averageRenderMs: rounded(averageRenderMs),
      p95RenderMs: rounded(p95RenderMs),
      averageFpsTargetMet: frameMetrics.meetsAverageFpsTarget
    },
    profiling: {
      cpu: {
        systemCpuPercentAvailable: false,
        systemCpuPercent: null,
        averageJavaScriptRenderMs: rounded(averageRenderMs),
        p95JavaScriptRenderMs: rounded(p95RenderMs)
      },
      memory: {
        processRamUsageAvailable: false,
        browserHeapApiAvailable:
          heapBefore.supported &&
          heapAfterRoundTrip.supported &&
          heapAfterRendering.supported,
        usedJSHeapBytesBefore: heapBefore.usedBytes,
        usedJSHeapBytesAfterRoundTrip: heapAfterRoundTrip.usedBytes,
        usedJSHeapBytesAfterRender: heapAfterRendering.usedBytes,
        totalJSHeapBytesAfterRender: heapAfterRendering.totalBytes,
        jsHeapSizeLimitBytes: heapAfterRendering.limitBytes
      },
      chunks: {
        totalChunks: construction.chunkCount,
        renderedChunksPerFrame: visibleChunksPerFrame,
        simulationStatesAvailable: false
      },
      physics: { status: 'not-implemented' },
      collision: { status: 'not-implemented' }
    },
    gateAApproved: false
  };
}
