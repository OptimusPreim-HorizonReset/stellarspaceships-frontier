import {
  createGateAConstruction,
  GATE_A_PROFILE
} from './gateAProfile';
import { summarizeFrameIntervals } from './frameMetrics';
import { deserializeConstruction, serializeConstruction } from '../save/serialization';
import {
  CanvasWorldRenderer,
  TILE_PIXEL_SIZE
} from '../rendering/canvasWorldRenderer';

interface FrameSamples {
  readonly intervalsMs: readonly number[];
  readonly renderDurationsMs: readonly number[];
}

interface BrowserHeapSnapshot {
  readonly supported: boolean;
  readonly usedBytes: number | null;
  readonly totalBytes: number | null;
  readonly limitBytes: number | null;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : null;
}

function readBrowserHeapSnapshot(): BrowserHeapSnapshot {
  const memory: unknown = Reflect.get(performance, 'memory');

  if (!isRecord(memory)) {
    return {
      supported: false,
      usedBytes: null,
      totalBytes: null,
      limitBytes: null
    };
  }

  const usedBytes = nonNegativeNumber(memory['usedJSHeapSize']);
  const totalBytes = nonNegativeNumber(memory['totalJSHeapSize']);
  const limitBytes = nonNegativeNumber(memory['jsHeapSizeLimit']);

  return {
    supported:
      usedBytes !== null && totalBytes !== null && limitBytes !== null,
    usedBytes,
    totalBytes,
    limitBytes
  };
}

function percentile(values: readonly number[], fraction: number): number {
  const sortedValues = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sortedValues.length * fraction) - 1;
  const value = sortedValues[index];

  if (value === undefined) {
    throw new RangeError('Unable to calculate a percentile from empty samples.');
  }

  return value;
}

function collectFrames(
  renderer: CanvasWorldRenderer
): Promise<FrameSamples> {
  const construction = createGateAConstruction();
  const intervalsMs: number[] = [];
  const renderDurationsMs: number[] = [];

  return new Promise((resolve, reject) => {
    let previousTimestamp: number | undefined;
    let warmupFramesRemaining = GATE_A_PROFILE.warmupFrames;
    let animationFrameId = 0;

    const timeoutId = window.setTimeout(() => {
      window.cancelAnimationFrame(animationFrameId);
      reject(
        new Error(
          'Benchmark timed out. Keep the browser tab visible and try again.'
        )
      );
    }, GATE_A_PROFILE.timeoutMs);

    const onFrame = (timestamp: number): void => {
      const renderStartedAt = performance.now();

      try {
        renderer.render(construction);
      } catch (error) {
        window.clearTimeout(timeoutId);
        reject(error);
        return;
      }

      const renderDurationMs = performance.now() - renderStartedAt;

      if (previousTimestamp !== undefined) {
        if (warmupFramesRemaining > 0) {
          warmupFramesRemaining -= 1;
        } else {
          intervalsMs.push(timestamp - previousTimestamp);
          renderDurationsMs.push(renderDurationMs);
        }
      }

      previousTimestamp = timestamp;

      if (intervalsMs.length >= GATE_A_PROFILE.measuredFrames) {
        window.clearTimeout(timeoutId);
        resolve({ intervalsMs, renderDurationsMs });
        return;
      }

      animationFrameId = window.requestAnimationFrame(onFrame);
    };

    animationFrameId = window.requestAnimationFrame(onFrame);
  });
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
    samples.renderDurationsMs.reduce((sum, duration) => sum + duration, 0) /
    samples.renderDurationsMs.length;
  const p95RenderMs = percentile(samples.renderDurationsMs, 0.95);

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
