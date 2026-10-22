export interface FrameMetrics {
  readonly averageFrameIntervalMs: number;
  readonly averageFps: number;
  readonly p95FrameIntervalMs: number;
  readonly framesOverBudget: number;
  readonly meetsAverageFpsTarget: boolean;
}

export function summarizeFrameIntervals(
  intervalsMs: readonly number[],
  targetFps: number
): FrameMetrics {
  if (intervalsMs.length === 0) {
    throw new RangeError('At least one frame interval is required.');
  }

  if (!Number.isFinite(targetFps) || targetFps <= 0) {
    throw new RangeError('Target FPS must be a positive finite number.');
  }

  if (!intervalsMs.every((interval) => Number.isFinite(interval) && interval > 0)) {
    throw new RangeError('Frame intervals must be positive finite numbers.');
  }

  const averageFrameIntervalMs =
    intervalsMs.reduce((sum, interval) => sum + interval, 0) /
    intervalsMs.length;
  const sortedIntervals = [...intervalsMs].sort(
    (left, right) => left - right
  );
  const percentileIndex = Math.ceil(sortedIntervals.length * 0.95) - 1;
  const p95FrameIntervalMs = sortedIntervals[percentileIndex];

  if (p95FrameIntervalMs === undefined) {
    throw new Error('Unable to calculate the p95 frame interval.');
  }

  const frameBudgetMs = 1000 / targetFps;
  const averageFps = 1000 / averageFrameIntervalMs;

  return {
    averageFrameIntervalMs,
    averageFps,
    p95FrameIntervalMs,
    framesOverBudget: intervalsMs.filter(
      (interval) => interval > frameBudgetMs
    ).length,
    meetsAverageFpsTarget: averageFps >= targetFps
  };
}
