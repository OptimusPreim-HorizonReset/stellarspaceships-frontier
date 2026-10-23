export interface BrowserHeapSnapshot {
  readonly supported: boolean;
  readonly usedBytes: number | null;
  readonly totalBytes: number | null;
  readonly limitBytes: number | null;
}

export interface BrowserFrameSamples {
  readonly intervalsMs: readonly number[];
  readonly workDurationsMs: readonly number[];
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

export function readBrowserHeapSnapshot(): BrowserHeapSnapshot {
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

export function percentile(
  values: readonly number[],
  fraction: number
): number {
  const sortedValues = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sortedValues.length * fraction) - 1;
  const value = sortedValues[index];

  if (value === undefined) {
    throw new RangeError('Unable to calculate a percentile from empty samples.');
  }

  return value;
}

export function collectBrowserFrames(
  runFrame: () => void,
  warmupFrames: number,
  measuredFrames: number,
  timeoutMs: number
): Promise<BrowserFrameSamples> {
  if (!Number.isSafeInteger(warmupFrames) || warmupFrames < 0) {
    throw new RangeError('Warmup frame count must be a non-negative integer.');
  }

  if (!Number.isSafeInteger(measuredFrames) || measuredFrames <= 0) {
    throw new RangeError('Measured frame count must be a positive integer.');
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('Benchmark timeout must be finite and positive.');
  }

  const intervalsMs: number[] = [];
  const workDurationsMs: number[] = [];

  return new Promise((resolve, reject) => {
    let previousTimestamp: number | undefined;
    let warmupFramesRemaining = warmupFrames;
    let animationFrameId = 0;

    const timeoutId = window.setTimeout(() => {
      window.cancelAnimationFrame(animationFrameId);
      reject(
        new Error(
          'Benchmark timed out. Keep the browser tab visible and try again.'
        )
      );
    }, timeoutMs);

    const onFrame = (timestamp: number): void => {
      const workStartedAt = performance.now();

      try {
        runFrame();
      } catch (error) {
        window.clearTimeout(timeoutId);
        reject(error);
        return;
      }

      const workDurationMs = performance.now() - workStartedAt;

      if (previousTimestamp !== undefined) {
        if (warmupFramesRemaining > 0) {
          warmupFramesRemaining -= 1;
        } else {
          intervalsMs.push(timestamp - previousTimestamp);
          workDurationsMs.push(workDurationMs);
        }
      }

      previousTimestamp = timestamp;

      if (intervalsMs.length >= measuredFrames) {
        window.clearTimeout(timeoutId);
        resolve({ intervalsMs, workDurationsMs });
        return;
      }

      animationFrameId = window.requestAnimationFrame(onFrame);
    };

    animationFrameId = window.requestAnimationFrame(onFrame);
  });
}
