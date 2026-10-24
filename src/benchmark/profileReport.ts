import type { BrowserHeapSnapshot } from './browserProfile';

export type ProfileMetricStatus =
  | 'measured'
  | 'unavailable'
  | 'not-measured'
  | 'not-implemented';

export type ProfileMetric<T> =
  | { readonly status: 'measured'; readonly value: T }
  | {
      readonly status: Exclude<ProfileMetricStatus, 'measured'>;
      readonly value: null;
      readonly reason: string;
    };

export interface BenchmarkProfilingReport {
  readonly cpu: {
    readonly systemCpuPercent: ProfileMetric<number>;
    readonly javascriptFrameWorkMs: ProfileMetric<{
      readonly averageMs: number;
      readonly p95Ms: number;
    }>;
  };
  readonly memory: {
    readonly processRamBytes: ProfileMetric<number>;
    readonly browserJsHeap: ProfileMetric<{
      readonly usedBytesBefore: number;
      readonly usedBytesAfter: number;
      readonly jsHeapDeltaBytes: number;
      readonly totalJSHeapBytesAfter: number;
      readonly jsHeapSizeLimitBytes: number;
    }>;
  };
  readonly chunks: {
    readonly totalChunks: ProfileMetric<number>;
    readonly renderedChunksPerFrame: ProfileMetric<number>;
    readonly activeSimulationStates: ProfileMetric<number>;
  };
  readonly physics: {
    readonly stepCount: ProfileMetric<number>;
    readonly durationMs: ProfileMetric<number>;
  };
  readonly collision: {
    readonly broadphaseCandidates: ProfileMetric<number>;
    readonly impacts: ProfileMetric<number>;
    readonly damageEvents: ProfileMetric<number>;
    readonly durationMs: ProfileMetric<number>;
  };
  readonly persistence: {
    readonly serializeMs: ProfileMetric<number>;
    readonly deserializeMs: ProfileMetric<number>;
    readonly roundTripVerified: ProfileMetric<boolean>;
  };
}

export interface BenchmarkProfilingInput {
  readonly javascriptFrameWorkMs: {
    readonly averageMs: number;
    readonly p95Ms: number;
  };
  readonly heapBefore: BrowserHeapSnapshot;
  readonly heapAfter: BrowserHeapSnapshot;
  readonly chunks?: {
    readonly totalChunks: number;
    readonly renderedChunksPerFrame: number;
  };
  readonly collision?: {
    readonly broadphaseCandidates: number;
    readonly impacts: number;
    readonly damageEvents: number;
  };
  readonly persistence?: {
    readonly serializeMs: number;
    readonly deserializeMs: number;
    readonly roundTripVerified: boolean;
  };
}

function measured<T>(value: T): ProfileMetric<T> {
  return { status: 'measured', value };
}

function unavailable<T>(reason: string): ProfileMetric<T> {
  return { status: 'unavailable', value: null, reason };
}

function notMeasured<T>(reason: string): ProfileMetric<T> {
  return { status: 'not-measured', value: null, reason };
}

function createBrowserHeapMetric(
  before: BrowserHeapSnapshot,
  after: BrowserHeapSnapshot
): ProfileMetric<{
  readonly usedBytesBefore: number;
  readonly usedBytesAfter: number;
  readonly jsHeapDeltaBytes: number;
  readonly totalJSHeapBytesAfter: number;
  readonly jsHeapSizeLimitBytes: number;
}> {
  if (
    !before.supported ||
    !after.supported ||
    before.usedBytes === null ||
    after.usedBytes === null ||
    after.totalBytes === null ||
    after.limitBytes === null
  ) {
    return unavailable(
      'The browser does not expose a complete performance.memory snapshot.'
    );
  }

  return measured({
    usedBytesBefore: before.usedBytes,
    usedBytesAfter: after.usedBytes,
    jsHeapDeltaBytes: after.usedBytes - before.usedBytes,
    totalJSHeapBytesAfter: after.totalBytes,
    jsHeapSizeLimitBytes: after.limitBytes
  });
}

export function createBenchmarkProfilingReport(
  input: BenchmarkProfilingInput
): BenchmarkProfilingReport {
  const collision = input.collision;
  const persistence = input.persistence;
  const chunks = input.chunks;

  return {
    cpu: {
      systemCpuPercent: unavailable(
        'Browser APIs do not expose system-wide CPU utilization.'
      ),
      javascriptFrameWorkMs: measured(input.javascriptFrameWorkMs)
    },
    memory: {
      processRamBytes: unavailable(
        'Browser APIs do not expose process or system RAM usage.'
      ),
      browserJsHeap: createBrowserHeapMetric(
        input.heapBefore,
        input.heapAfter
      )
    },
    chunks: {
      totalChunks:
        chunks === undefined
          ? notMeasured('This profile does not measure Construction chunks.')
          : measured(chunks.totalChunks),
      renderedChunksPerFrame:
        chunks === undefined
          ? notMeasured('This profile does not measure Construction chunks.')
          : measured(chunks.renderedChunksPerFrame),
      activeSimulationStates: notMeasured(
        'This profile does not sample active chunk simulation states.'
      )
    },
    physics: {
      stepCount: notMeasured(
        'Physics steps are not part of this benchmark workload.'
      ),
      durationMs: notMeasured(
        'Physics execution time is not isolated in this benchmark.'
      )
    },
    collision: {
      broadphaseCandidates:
        collision === undefined
          ? notMeasured('Collision is not part of this benchmark workload.')
          : measured(collision.broadphaseCandidates),
      impacts:
        collision === undefined
          ? notMeasured('Collision is not part of this benchmark workload.')
          : measured(collision.impacts),
      damageEvents:
        collision === undefined
          ? notMeasured('Collision is not part of this benchmark workload.')
          : measured(collision.damageEvents),
      durationMs: notMeasured(
        'Collision execution time is not isolated from other frame work.'
      )
    },
    persistence: {
      serializeMs:
        persistence === undefined
          ? notMeasured('Save/load is not part of this benchmark workload.')
          : measured(persistence.serializeMs),
      deserializeMs:
        persistence === undefined
          ? notMeasured('Save/load is not part of this benchmark workload.')
          : measured(persistence.deserializeMs),
      roundTripVerified:
        persistence === undefined
          ? notMeasured('Save/load is not part of this benchmark workload.')
          : measured(persistence.roundTripVerified)
    }
  };
}
