import { describe, expect, it } from 'vitest';
import { summarizeFrameIntervals } from '../src/benchmark/frameMetrics';

describe('frame metrics', () => {
  it('reports average FPS, p95 cadence, and frames exceeding the target budget', () => {
    const metrics = summarizeFrameIntervals([16, 16, 17, 20], 60);

    expect(metrics.averageFrameIntervalMs).toBeCloseTo(17.25);
    expect(metrics.averageFps).toBeCloseTo(57.97, 1);
    expect(metrics.p95FrameIntervalMs).toBe(20);
    expect(metrics.framesOverBudget).toBe(2);
    expect(metrics.meetsAverageFpsTarget).toBe(false);
  });

  it('rejects empty samples and invalid frame rates', () => {
    expect(() => summarizeFrameIntervals([], 60)).toThrow(
      'At least one frame interval is required.'
    );
    expect(() => summarizeFrameIntervals([16], 0)).toThrow(
      'Target FPS must be a positive finite number.'
    );
  });
});
