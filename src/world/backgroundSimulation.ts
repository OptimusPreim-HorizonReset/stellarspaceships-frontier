import { createSector, sectorKey } from './sector';
import type { Sector } from './sector';

export const MAX_BACKGROUND_STEPS_PER_SECTOR = 10_000;

export interface BackgroundSectorUpdate {
  readonly sector: Sector;
  readonly elapsedSeconds: number;
  readonly stepsPerformed: number;
}

export type SectorSimulationStep = (
  sector: Sector,
  deltaTimeSeconds: number
) => Sector;

export function simulateBackgroundSectors(
  sectors: readonly Sector[],
  elapsedSeconds: number,
  maxStepSeconds: number,
  simulateStep: SectorSimulationStep
): readonly BackgroundSectorUpdate[] {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError(
      'Background elapsed time must be finite and non-negative.'
    );
  }

  if (!Number.isFinite(maxStepSeconds) || maxStepSeconds <= 0) {
    throw new RangeError('Background max step must be finite and positive.');
  }

  if (typeof simulateStep !== 'function') {
    throw new TypeError('Background simulation step must be a function.');
  }

  const stepCount =
    elapsedSeconds === 0 ? 0 : Math.ceil(elapsedSeconds / maxStepSeconds);

  if (
    !Number.isSafeInteger(stepCount) ||
    stepCount > MAX_BACKGROUND_STEPS_PER_SECTOR
  ) {
    throw new RangeError(
      `Background update exceeds ${MAX_BACKGROUND_STEPS_PER_SECTOR} steps per sector.`
    );
  }

  const sortedSectors = [...sectors].sort(
    (left, right) =>
      left.position.y - right.position.y ||
      left.position.x - right.position.x
  );
  const seenKeys = new Set<string>();
  const updates: BackgroundSectorUpdate[] = [];

  for (const originalSector of sortedSectors) {
    const originalKey = sectorKey(originalSector.position);

    if (seenKeys.has(originalKey)) {
      throw new TypeError(`Duplicate background sector: ${originalKey}.`);
    }

    seenKeys.add(originalKey);
    let sector = originalSector;
    let remainingSeconds = elapsedSeconds;

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const deltaTimeSeconds = Math.min(maxStepSeconds, remainingSeconds);

      if (deltaTimeSeconds <= 0) {
        break;
      }

      const updatedSector = simulateStep(sector, deltaTimeSeconds);

      if (
        sectorKey(updatedSector.position) !== originalKey ||
        updatedSector.seed !== originalSector.seed
      ) {
        throw new TypeError(
          `Background simulation must preserve sector position and seed for ${originalKey}.`
        );
      }

      sector = createSector(updatedSector);
      remainingSeconds -= deltaTimeSeconds;
    }

    updates.push({
      sector,
      elapsedSeconds,
      stepsPerformed: stepCount
    });
  }

  return Object.freeze(updates);
}
