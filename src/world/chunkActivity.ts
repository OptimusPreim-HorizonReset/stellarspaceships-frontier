import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';
import {
  assertValidChunkActivityTimeouts,
  isChunkState,
  type ChunkState
} from './chunk';
import type {
  ChunkActivityTimeouts,
  ChunkStateTransition
} from './chunk';

export const CHUNK_ACTIVATION_EVENTS = ['nearby', 'combat'] as const;

export type ChunkActivationEvent = (typeof CHUNK_ACTIVATION_EVENTS)[number];

export interface ChunkActivityTransition extends ChunkStateTransition {
  readonly position: ChunkPosition;
}

const chunkActivationEventSet = new Set<string>(CHUNK_ACTIVATION_EVENTS);
const statePriority: Readonly<Record<ChunkState, number>> = {
  dormant: 0,
  active: 1,
  combat: 2
};

export function isChunkActivationEvent(
  value: unknown
): value is ChunkActivationEvent {
  return (
    typeof value === 'string' &&
    chunkActivationEventSet.has(value)
  );
}

export function activateChunkForEvent(
  construction: Construction,
  position: ChunkPosition,
  event: ChunkActivationEvent
): ChunkState {
  if (!isChunkActivationEvent(event)) {
    throw new TypeError(`Unknown chunk activation event: ${String(event)}.`);
  }

  const currentState = construction.getChunkState(position);

  if (currentState === undefined) {
    throw new RangeError(
      `Chunk does not exist at (${position.x}, ${position.y}).`
    );
  }

  const nextState: ChunkState = event === 'combat' ? 'combat' : 'active';

  if (!isChunkState(currentState)) {
    throw new TypeError(`Invalid chunk state: ${String(currentState)}.`);
  }

  const effectiveState =
    statePriority[nextState] > statePriority[currentState]
      ? nextState
      : currentState;

  construction.setChunkState(position, effectiveState);
  return effectiveState;
}

export function advanceChunkActivity(
  construction: Construction,
  deltaTimeSeconds: number,
  timeouts: ChunkActivityTimeouts
): ChunkActivityTransition[] {
  if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
    throw new RangeError(
      'Chunk activity delta time must be finite and non-negative.'
    );
  }

  assertValidChunkActivityTimeouts(timeouts);
  const chunks = Array.from(construction.iterateChunks()).sort(
    (left, right) =>
      left.position.y - right.position.y ||
      left.position.x - right.position.x
  );
  const transitions: ChunkActivityTransition[] = [];

  for (const chunk of chunks) {
    for (const transition of chunk.advanceActivity(deltaTimeSeconds, timeouts)) {
      transitions.push({
        position: { ...chunk.position },
        ...transition
      });
    }
  }

  return transitions;
}
