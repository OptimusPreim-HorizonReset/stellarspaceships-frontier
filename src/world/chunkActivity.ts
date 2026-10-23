import type { ChunkPosition } from '../core/coordinates';
import type { Construction } from '../construction/construction';
import {
  isChunkState,
  type ChunkState
} from './chunk';

export const CHUNK_ACTIVATION_EVENTS = ['nearby', 'combat'] as const;

export type ChunkActivationEvent = (typeof CHUNK_ACTIVATION_EVENTS)[number];

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

  if (statePriority[nextState] > statePriority[currentState]) {
    construction.setChunkState(position, nextState);
    return nextState;
  }

  return currentState;
}
