import { describe, expect, it } from 'vitest';
import { createBenchmarkProfilingReport } from '../src/benchmark/profileReport';

describe('benchmark profiling report', () => {
  it('labels measured and unavailable metrics explicitly', () => {
    const report = createBenchmarkProfilingReport({
      javascriptFrameWorkMs: { averageMs: 3.5, p95Ms: 5.2 },
      heapBefore: {
        supported: true,
        usedBytes: 1000,
        totalBytes: 2000,
        limitBytes: 10_000
      },
      heapAfter: {
        supported: true,
        usedBytes: 1300,
        totalBytes: 2300,
        limitBytes: 10_000
      },
      chunks: { totalChunks: 12, renderedChunksPerFrame: 2 },
      collision: {
        broadphaseCandidates: 50,
        impacts: 4,
        damageEvents: 3
      },
      persistence: {
        serializeMs: 1.2,
        deserializeMs: 2.4,
        roundTripVerified: true
      }
    });

    expect(report.cpu.systemCpuPercent.status).toBe('unavailable');
    expect(report.cpu.javascriptFrameWorkMs).toEqual({
      status: 'measured',
      value: { averageMs: 3.5, p95Ms: 5.2 }
    });
    expect(report.memory.processRamBytes.status).toBe('unavailable');
    expect(report.memory.browserJsHeap).toEqual({
      status: 'measured',
      value: {
        usedBytesBefore: 1000,
        usedBytesAfter: 1300,
        jsHeapDeltaBytes: 300,
        totalJSHeapBytesAfter: 2300,
        jsHeapSizeLimitBytes: 10_000
      }
    });
    expect(report.chunks.activeSimulationStates.status).toBe('not-measured');
    expect(report.physics.stepCount.status).toBe('not-measured');
    expect(report.collision.broadphaseCandidates).toEqual({
      status: 'measured',
      value: 50
    });
    expect(report.collision.durationMs.status).toBe('not-measured');
    expect(report.persistence.roundTripVerified).toEqual({
      status: 'measured',
      value: true
    });
  });

  it('does not disguise missing heap support or unprofiled systems as success', () => {
    const report = createBenchmarkProfilingReport({
      javascriptFrameWorkMs: { averageMs: 4, p95Ms: 6 },
      heapBefore: {
        supported: false,
        usedBytes: null,
        totalBytes: null,
        limitBytes: null
      },
      heapAfter: {
        supported: false,
        usedBytes: null,
        totalBytes: null,
        limitBytes: null
      },
      chunks: { totalChunks: 8, renderedChunksPerFrame: 1 }
    });

    expect(report.memory.browserJsHeap).toMatchObject({
      status: 'unavailable',
      value: null
    });
    expect(report.collision.impacts).toMatchObject({
      status: 'not-measured',
      value: null
    });
    expect(report.persistence.serializeMs).toMatchObject({
      status: 'not-measured',
      value: null
    });
  });

  it('marks construction chunk metrics not measured for sector-only profiles', () => {
    const report = createBenchmarkProfilingReport({
      javascriptFrameWorkMs: { averageMs: 2, p95Ms: 3 },
      heapBefore: {
        supported: false,
        usedBytes: null,
        totalBytes: null,
        limitBytes: null
      },
      heapAfter: {
        supported: false,
        usedBytes: null,
        totalBytes: null,
        limitBytes: null
      }
    });

    expect(report.chunks.totalChunks).toMatchObject({
      status: 'not-measured',
      value: null
    });
    expect(report.chunks.renderedChunksPerFrame).toMatchObject({
      status: 'not-measured',
      value: null
    });
  });
});
