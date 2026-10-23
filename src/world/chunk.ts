import { CHUNK_SIZE } from '../core/config';
import type { ChunkPosition, TilePosition } from '../core/coordinates';
import type { Tile } from '../core/tiles';

export const CHUNK_STATES = ['dormant', 'active', 'combat'] as const;

export type ChunkState = (typeof CHUNK_STATES)[number];

export interface ChunkActivityTimeouts {
  readonly activeSeconds: number;
  readonly combatSeconds: number;
}

export interface ChunkStateTransition {
  readonly from: ChunkState;
  readonly to: ChunkState;
}

const chunkStateSet = new Set<string>(CHUNK_STATES);

export function isChunkState(value: unknown): value is ChunkState {
  return typeof value === 'string' && chunkStateSet.has(value);
}

export function assertValidChunkActivityTimeouts(
  timeouts: ChunkActivityTimeouts
): void {
  if (
    !Number.isFinite(timeouts.activeSeconds) ||
    !Number.isFinite(timeouts.combatSeconds) ||
    timeouts.activeSeconds <= 0 ||
    timeouts.combatSeconds <= 0
  ) {
    throw new RangeError('Chunk activity timeouts must be finite and positive.');
  }
}

export interface LocalTileEntry {
  readonly position: TilePosition;
  readonly tile: Tile;
}

export class Chunk {
  private readonly cells: Array<Tile | undefined>;
  private occupiedCells = 0;
  private activityState: ChunkState = 'dormant';
  private secondsSinceActivity = 0;

  constructor(
    readonly position: ChunkPosition,
    readonly size = CHUNK_SIZE
  ) {
    if (!Number.isSafeInteger(size) || size <= 0) {
      throw new RangeError('Chunk size must be a positive safe integer.');
    }

    if (
      !Number.isSafeInteger(position.x) ||
      !Number.isSafeInteger(position.y)
    ) {
      throw new RangeError('Chunk coordinates must be safe integers.');
    }

    this.cells = Array<Tile | undefined>(size * size).fill(undefined);
  }

  get tileCount(): number {
    return this.occupiedCells;
  }

  get state(): ChunkState {
    return this.activityState;
  }

  setState(state: ChunkState): void {
    if (!isChunkState(state)) {
      throw new TypeError(`Invalid chunk state: ${String(state)}.`);
    }

    this.activityState = state;
    this.secondsSinceActivity = 0;
  }

  advanceActivity(
    deltaTimeSeconds: number,
    timeouts: ChunkActivityTimeouts
  ): ChunkStateTransition[] {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
      throw new RangeError(
        'Chunk activity delta time must be finite and non-negative.'
      );
    }

    assertValidChunkActivityTimeouts(timeouts);
    let remainingSeconds = deltaTimeSeconds;
    const transitions: ChunkStateTransition[] = [];

    while (remainingSeconds > 0 && this.activityState !== 'dormant') {
      const timeoutSeconds =
        this.activityState === 'combat'
          ? timeouts.combatSeconds
          : timeouts.activeSeconds;
      const secondsUntilTransition =
        timeoutSeconds - this.secondsSinceActivity;

      if (remainingSeconds < secondsUntilTransition) {
        this.secondsSinceActivity += remainingSeconds;
        break;
      }

      remainingSeconds -= secondsUntilTransition;
      const from = this.activityState;
      const to: ChunkState = from === 'combat' ? 'active' : 'dormant';
      this.setState(to);
      transitions.push({ from, to });
    }

    return transitions;
  }

  getTile(position: TilePosition): Tile | undefined {
    return this.cells[this.indexFor(position)];
  }

  setTile(position: TilePosition, tile: Tile): Tile | undefined {
    const index = this.indexFor(position);
    const previous = this.cells[index];

    if (previous === undefined) {
      this.occupiedCells += 1;
    }

    this.cells[index] = tile;
    return previous;
  }

  removeTile(position: TilePosition): Tile | undefined {
    const index = this.indexFor(position);
    const previous = this.cells[index];

    if (previous !== undefined) {
      this.cells[index] = undefined;
      this.occupiedCells -= 1;
    }

    return previous;
  }

  *entries(): IterableIterator<LocalTileEntry> {
    for (let index = 0; index < this.cells.length; index += 1) {
      const tile = this.cells[index];

      if (tile !== undefined) {
        yield {
          position: {
            x: index % this.size,
            y: Math.floor(index / this.size)
          },
          tile
        };
      }
    }
  }

  private indexFor(position: TilePosition): number {
    if (
      !Number.isSafeInteger(position.x) ||
      !Number.isSafeInteger(position.y) ||
      position.x < 0 ||
      position.y < 0 ||
      position.x >= this.size ||
      position.y >= this.size
    ) {
      throw new RangeError('Local tile coordinates are outside this chunk.');
    }

    return position.y * this.size + position.x;
  }
}
