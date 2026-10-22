import { CHUNK_SIZE } from './config';

export interface TilePosition {
  readonly x: number;
  readonly y: number;
}

export interface ChunkPosition {
  readonly x: number;
  readonly y: number;
}

function assertTilePosition(position: TilePosition): void {
  if (!Number.isSafeInteger(position.x) || !Number.isSafeInteger(position.y)) {
    throw new RangeError('Tile coordinates must be safe integers.');
  }
}

function assertChunkSize(chunkSize: number): void {
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new RangeError('Chunk size must be a positive safe integer.');
  }
}

export function chunkPositionForTile(
  position: TilePosition,
  chunkSize = CHUNK_SIZE
): ChunkPosition {
  assertTilePosition(position);
  assertChunkSize(chunkSize);

  return {
    x: Math.floor(position.x / chunkSize),
    y: Math.floor(position.y / chunkSize)
  };
}

export function localPositionForTile(
  position: TilePosition,
  chunkSize = CHUNK_SIZE
): TilePosition {
  const chunkPosition = chunkPositionForTile(position, chunkSize);

  return {
    x: position.x - chunkPosition.x * chunkSize,
    y: position.y - chunkPosition.y * chunkSize
  };
}

export function chunkKey(position: ChunkPosition): string {
  if (!Number.isSafeInteger(position.x) || !Number.isSafeInteger(position.y)) {
    throw new RangeError('Chunk coordinates must be safe integers.');
  }

  return `${position.x},${position.y}`;
}
