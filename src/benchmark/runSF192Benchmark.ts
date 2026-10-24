import { CanvasWorldRenderer, TILE_PIXEL_SIZE } from '../rendering/canvasWorldRenderer';
import { summarizeFrameIntervals } from './frameMetrics';
import {
  collectBrowserFrames,
  percentile,
  readBrowserHeapSnapshot
} from './browserProfile';
import { createSF192Stations, SF_192_PROFILE } from './stationLoadProfile';

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

export interface SF192BenchmarkReport {
  readonly schemaVersion: 1;
  readonly profile: 'SF-192';
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
  readonly setupMs: number;
  readonly workload: {
    readonly stationCount: number;
    readonly tilesPerStation: number;
    readonly totalTiles: number;
    readonly chunksPerStation: number;
    readonly totalChunks: number;
    readonly renderPassesPerFrame: number;
    readonly visibleTilesPerStation: number;
    readonly visibleChunksPerStation: number;
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
  readonly gateApproved: false;
}

export async function runSF192Benchmark(
  canvas: HTMLCanvasElement,
  renderer: CanvasWorldRenderer,
  buildMode: string
): Promise<SF192BenchmarkReport> {
  const heapBefore = readBrowserHeapSnapshot();
  const setupStartedAt = performance.now();
  const stations = createSF192Stations();
  const heapAfterSetup = readBrowserHeapSnapshot();
  const setupMs = performance.now() - setupStartedAt;
  const visibleColumns = Math.ceil(canvas.clientWidth / TILE_PIXEL_SIZE);
  const visibleRows = Math.ceil(canvas.clientHeight / TILE_PIXEL_SIZE);

  if (visibleColumns === 0 || visibleRows === 0) {
    throw new Error('SF-192 requires a visible, non-zero canvas.');
  }

  const visibleBounds = {
    minX: 0,
    minY: 0,
    maxXExclusive: visibleColumns,
    maxYExclusive: visibleRows
  };
  const visibleTilesPerStation =
    stations[0]?.construction.getTilesInBounds(visibleBounds).length;
  const visibleChunksPerStation =
    stations[0]?.construction.getChunkCountInBounds(visibleBounds);

  if (
    visibleTilesPerStation === undefined ||
    visibleChunksPerStation === undefined
  ) {
    throw new Error('SF-192 station profile is empty.');
  }

  const samples = await collectBrowserFrames(
    () => {
      for (const station of stations) {
        renderer.render(station.construction);
      }
    },
    SF_192_PROFILE.warmupFrames,
    SF_192_PROFILE.measuredFrames,
    SF_192_PROFILE.timeoutMs
  );
  const heapAfterRender = readBrowserHeapSnapshot();
  const frameMetrics = summarizeFrameIntervals(
    samples.intervalsMs,
    SF_192_PROFILE.targetFps
  );
  const averageFrameWorkMs =
    samples.workDurationsMs.reduce((sum, duration) => sum + duration, 0) /
    samples.workDurationsMs.length;
  const totalTiles = stations.reduce(
    (total, station) => total + station.construction.tileCount,
    0
  );
  const totalChunks = stations.reduce(
    (total, station) => total + station.construction.chunkCount,
    0
  );
  const jsHeapDeltaBytes =
    heapBefore.usedBytes === null || heapAfterRender.usedBytes === null
      ? null
      : heapAfterRender.usedBytes - heapBefore.usedBytes;

  return {
    schemaVersion: 1,
    profile: 'SF-192',
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
      stationCount: stations.length,
      tilesPerStation: SF_192_PROFILE.tilesPerStation,
      totalTiles,
      chunksPerStation: stations[0]?.construction.chunkCount ?? 0,
      totalChunks,
      renderPassesPerFrame: stations.length,
      visibleTilesPerStation,
      visibleChunksPerStation
    },
    rendering: {
      targetFps: SF_192_PROFILE.targetFps,
      warmupFrames: SF_192_PROFILE.warmupFrames,
      measuredFrames: samples.intervalsMs.length,
      averageFps: rounded(frameMetrics.averageFps),
      averageFrameIntervalMs: rounded(
        frameMetrics.averageFrameIntervalMs
      ),
      p95FrameIntervalMs: rounded(frameMetrics.p95FrameIntervalMs),
      framesOverBudget: frameMetrics.framesOverBudget,
      averageFrameWorkMs: rounded(averageFrameWorkMs),
      p95FrameWorkMs: rounded(
        percentile(samples.workDurationsMs, 0.95)
      ),
      averageFpsTargetMet: frameMetrics.meetsAverageFpsTarget
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
      jsHeapDeltaBytes,
      totalJSHeapBytesAfterRender: heapAfterRender.totalBytes,
      jsHeapSizeLimitBytes: heapAfterRender.limitBytes
    },
    gateApproved: false,
    setupMs: rounded(setupMs)
  };
}
