import {
  chunkKey,
  chunkPositionForTile,
  localPositionForTile
} from '../core/coordinates';
import type { ChunkPosition, TilePosition } from '../core/coordinates';
import {
  DEFAULT_TILE_REGISTRY,
  isTileOrientation,
  type Tile,
  type TileRegistry,
  type TileOrientation,
  type TileType
} from '../core/tiles';
import { Chunk } from '../world/chunk';
import { isChunkState } from '../world/chunk';
import type { ChunkState } from '../world/chunk';

export interface PlacedTile {
  readonly position: TilePosition;
  readonly tile: Tile;
}

export interface TileBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxXExclusive: number;
  readonly maxYExclusive: number;
}

const NEIGHBOR_OFFSETS: readonly TilePosition[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 }
];

function tilePositionKey(position: TilePosition): string {
  return `${position.x},${position.y}`;
}

function chunkRangeForBounds(
  bounds: TileBounds
): { readonly first: ChunkPosition; readonly last: ChunkPosition } | undefined {
  const coordinates = [
    bounds.minX,
    bounds.minY,
    bounds.maxXExclusive,
    bounds.maxYExclusive
  ];

  if (!coordinates.every(Number.isSafeInteger)) {
    throw new RangeError('Tile bounds must use safe integer coordinates.');
  }

  if (
    bounds.maxXExclusive <= bounds.minX ||
    bounds.maxYExclusive <= bounds.minY
  ) {
    return undefined;
  }

  return {
    first: chunkPositionForTile({ x: bounds.minX, y: bounds.minY }),
    last: chunkPositionForTile({
      x: bounds.maxXExclusive - 1,
      y: bounds.maxYExclusive - 1
    })
  };
}

function assertValidConstructionId(id: string): void {
  if (id.trim().length === 0) {
    throw new TypeError('Construction ID must not be empty.');
  }
}

export class Construction {
  private readonly chunks = new Map<string, Chunk>();
  private readonly usedTileIds = new Set<number>();
  private nextTileId = 1;
  private placedTileCount = 0;

  constructor(
    readonly id: string,
    readonly tileRegistry: TileRegistry = DEFAULT_TILE_REGISTRY
  ) {
    assertValidConstructionId(id);
  }

  get tileCount(): number {
    return this.placedTileCount;
  }

  get chunkCount(): number {
    return this.chunks.size;
  }

  getTile(position: TilePosition): Tile | undefined {
    const chunkPosition = chunkPositionForTile(position);
    const chunk = this.chunks.get(chunkKey(chunkPosition));

    if (chunk === undefined) {
      return undefined;
    }

    return chunk.getTile(localPositionForTile(position));
  }

  getChunkState(position: ChunkPosition): ChunkState | undefined {
    return this.chunks.get(chunkKey(position))?.state;
  }

  setChunkState(position: ChunkPosition, state: ChunkState): void {
    if (!isChunkState(state)) {
      throw new TypeError(`Invalid chunk state: ${String(state)}.`);
    }

    const chunk = this.chunks.get(chunkKey(position));

    if (chunk === undefined) {
      throw new RangeError(
        `Chunk does not exist at (${position.x}, ${position.y}).`
      );
    }

    chunk.setState(state);
  }

  placeTile(
    position: TilePosition,
    type: TileType,
    orientation: TileOrientation = 'north'
  ): Tile {
    const definition = this.tileRegistry.get(type);

    if (definition === undefined) {
      throw new RangeError(`Tile type is not registered: ${type}.`);
    }

    if (!Number.isSafeInteger(this.nextTileId)) {
      throw new RangeError('No additional tile IDs are available.');
    }

    if (!isTileOrientation(orientation)) {
      throw new TypeError(`Invalid tile orientation: ${String(orientation)}.`);
    }

    const tile: Tile = {
      id: this.nextTileId,
      type,
      orientation,
      hp: definition.maxHp,
      armor: definition.armor,
      mass: definition.mass
    };

    this.putTile(position, tile, true);
    this.usedTileIds.add(tile.id);
    this.nextTileId += 1;
    return tile;
  }

  importTile(position: TilePosition, tile: Tile): void {
    const definition = this.tileRegistry.get(tile.type);

    if (definition === undefined) {
      throw new TypeError(`Tile type is not registered: ${tile.type}.`);
    }

    if (!Number.isSafeInteger(tile.id) || tile.id <= 0) {
      throw new RangeError('Tile ID must be a positive safe integer.');
    }

    if (this.usedTileIds.has(tile.id)) {
      throw new TypeError(`Duplicate tile ID: ${tile.id}.`);
    }

    if (!isTileOrientation(tile.orientation)) {
      throw new TypeError(`Invalid tile orientation: ${String(tile.orientation)}.`);
    }

    if (
      !Number.isFinite(tile.hp) ||
      tile.hp <= 0 ||
      tile.hp > definition.maxHp ||
      tile.armor !== definition.armor ||
      tile.mass !== definition.mass
    ) {
      throw new RangeError(`Invalid tile data for tile ID ${tile.id}.`);
    }

    const importedTile: Tile = {
      id: tile.id,
      type: tile.type,
      orientation: tile.orientation,
      hp: tile.hp,
      armor: definition.armor,
      mass: definition.mass
    };

    this.putTile(position, importedTile, false);
    this.usedTileIds.add(importedTile.id);
    this.nextTileId = Math.max(this.nextTileId, importedTile.id + 1);
  }

  removeTile(position: TilePosition): Tile | undefined {
    const chunkPosition = chunkPositionForTile(position);
    const key = chunkKey(chunkPosition);
    const chunk = this.chunks.get(key);

    if (chunk === undefined) {
      return undefined;
    }

    const removed = chunk.removeTile(localPositionForTile(position));

    if (removed !== undefined) {
      this.placedTileCount -= 1;

      if (chunk.tileCount === 0) {
        this.chunks.delete(key);
      }
    }

    return removed;
  }

  getTiles(): PlacedTile[] {
    return Array.from(this.iterateTiles()).sort(
      (left, right) =>
        left.position.y - right.position.y ||
        left.position.x - right.position.x
    );
  }

  *iterateTiles(): IterableIterator<PlacedTile> {
    for (const chunk of this.chunks.values()) {
      for (const entry of chunk.entries()) {
        yield {
          position: {
            x: chunk.position.x * chunk.size + entry.position.x,
            y: chunk.position.y * chunk.size + entry.position.y
          },
          tile: entry.tile
        };
      }
    }
  }

  getTilesInBounds(bounds: TileBounds): PlacedTile[] {
    const chunkRange = chunkRangeForBounds(bounds);

    if (chunkRange === undefined) {
      return [];
    }

    const visibleTiles: PlacedTile[] = [];

    for (
      let chunkY = chunkRange.first.y;
      chunkY <= chunkRange.last.y;
      chunkY += 1
    ) {
      for (
        let chunkX = chunkRange.first.x;
        chunkX <= chunkRange.last.x;
        chunkX += 1
      ) {
        const chunk = this.chunks.get(chunkKey({ x: chunkX, y: chunkY }));

        if (chunk === undefined) {
          continue;
        }

        for (const entry of chunk.entries()) {
          const position = {
            x: chunkX * chunk.size + entry.position.x,
            y: chunkY * chunk.size + entry.position.y
          };

          if (
            position.x >= bounds.minX &&
            position.x < bounds.maxXExclusive &&
            position.y >= bounds.minY &&
            position.y < bounds.maxYExclusive
          ) {
            visibleTiles.push({ position, tile: entry.tile });
          }
        }
      }
    }

    return visibleTiles;
  }

  getChunkCountInBounds(bounds: TileBounds): number {
    const chunkRange = chunkRangeForBounds(bounds);

    if (chunkRange === undefined) {
      return 0;
    }

    let visibleChunkCount = 0;

    for (
      let chunkY = chunkRange.first.y;
      chunkY <= chunkRange.last.y;
      chunkY += 1
    ) {
      for (
        let chunkX = chunkRange.first.x;
        chunkX <= chunkRange.last.x;
        chunkX += 1
      ) {
        if (this.chunks.has(chunkKey({ x: chunkX, y: chunkY }))) {
          visibleChunkCount += 1;
        }
      }
    }

    return visibleChunkCount;
  }

  getConnectedComponents(): TilePosition[][] {
    const remaining = new Map<string, TilePosition>();

    for (const placedTile of this.getTiles()) {
      remaining.set(
        tilePositionKey(placedTile.position),
        placedTile.position
      );
    }

    const components: TilePosition[][] = [];

    while (remaining.size > 0) {
      const firstPosition = remaining.values().next().value;

      if (firstPosition === undefined) {
        throw new Error('Unable to read the next unvisited tile position.');
      }

      remaining.delete(tilePositionKey(firstPosition));
      const component = [firstPosition];
      let queueIndex = 0;

      while (queueIndex < component.length) {
        const currentPosition = component[queueIndex];

        if (currentPosition === undefined) {
          throw new Error('Invalid tile position in connectivity queue.');
        }

        queueIndex += 1;

        for (const offset of NEIGHBOR_OFFSETS) {
          const neighbor = {
            x: currentPosition.x + offset.x,
            y: currentPosition.y + offset.y
          };
          const key = tilePositionKey(neighbor);
          const unvisitedNeighbor = remaining.get(key);

          if (unvisitedNeighbor !== undefined) {
            remaining.delete(key);
            component.push(unvisitedNeighbor);
          }
        }
      }

      components.push(component);
    }

    return components;
  }

  /**
   * Returns replacement fragments without mutating this source construction.
   * The world layer must replace the source atomically when it adopts them.
   */
  splitDisconnected(
    createFragmentId: (sourceId: string, fragmentIndex: number) => string
  ): Construction[] {
    const components = this.getConnectedComponents();

    if (components.length <= 1) {
      return [this];
    }

    const fragmentIds = new Set<string>();

    return components.map((component, fragmentIndex) => {
      const fragmentId = createFragmentId(this.id, fragmentIndex);
      assertValidConstructionId(fragmentId);

      if (fragmentId === this.id || fragmentIds.has(fragmentId)) {
        throw new TypeError(`Fragment ID must be unique: ${fragmentId}.`);
      }

      fragmentIds.add(fragmentId);
      const fragment = new Construction(fragmentId, this.tileRegistry);

      for (const position of component) {
        const tile = this.getTile(position);

        if (tile === undefined) {
          throw new Error('Tile disappeared while splitting construction.');
        }

        const sourceChunkPosition = chunkPositionForTile(position);
        const sourceChunkId = chunkKey(sourceChunkPosition);
        const sourceChunk = this.chunks.get(sourceChunkId);

        if (sourceChunk === undefined) {
          throw new Error('Source chunk disappeared while splitting construction.');
        }

        fragment.importTile(position, tile);
        const fragmentChunk = fragment.chunks.get(sourceChunkId);

        if (fragmentChunk === undefined) {
          throw new Error('Fragment chunk was not created while splitting.');
        }

        fragmentChunk.setState(sourceChunk.state);
      }

      return fragment;
    });
  }

  private putTile(
    position: TilePosition,
    tile: Tile,
    replace: boolean
  ): void {
    const chunkPosition = chunkPositionForTile(position);
    const key = chunkKey(chunkPosition);
    let chunk = this.chunks.get(key);

    if (chunk === undefined) {
      chunk = new Chunk(chunkPosition);
      this.chunks.set(key, chunk);
    }

    const localPosition = localPositionForTile(position);
    const previous = chunk.getTile(localPosition);

    if (previous !== undefined && !replace) {
      throw new TypeError(
        `A tile already exists at (${position.x}, ${position.y}).`
      );
    }

    chunk.setTile(localPosition, tile);

    if (previous === undefined) {
      this.placedTileCount += 1;
    }
  }
}
