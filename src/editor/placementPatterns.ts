import type { TilePosition } from '../core/coordinates';

export const PLACEMENT_SHAPES = ['single', 'line', 'rectangle'] as const;

export type PlacementShape = (typeof PLACEMENT_SHAPES)[number];

const placementShapeSet = new Set<string>(PLACEMENT_SHAPES);

export function isPlacementShape(value: unknown): value is PlacementShape {
  return typeof value === 'string' && placementShapeSet.has(value);
}

function assertValidPosition(position: TilePosition): void {
  if (!Number.isSafeInteger(position.x) || !Number.isSafeInteger(position.y)) {
    throw new RangeError('Placement coordinates must be safe integers.');
  }
}

function getConnectedLine(
  start: TilePosition,
  end: TilePosition
): TilePosition[] {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const stepsX = Math.abs(deltaX);
  const stepsY = Math.abs(deltaY);
  const directionX = Math.sign(deltaX);
  const directionY = Math.sign(deltaY);
  let advancedX = 0;
  let advancedY = 0;
  let x = start.x;
  let y = start.y;
  const positions: TilePosition[] = [{ x, y }];

  while (advancedX < stepsX || advancedY < stepsY) {
    const progressX =
      stepsX === 0 ? Number.POSITIVE_INFINITY : advancedX / stepsX;
    const progressY =
      stepsY === 0 ? Number.POSITIVE_INFINITY : advancedY / stepsY;

    if (advancedX < stepsX && progressX <= progressY) {
      x += directionX;
      advancedX += 1;
    } else {
      y += directionY;
      advancedY += 1;
    }

    positions.push({ x, y });
  }

  return positions;
}

export function getPlacementPositions(
  start: TilePosition,
  end: TilePosition,
  shape: PlacementShape
): TilePosition[] {
  assertValidPosition(start);
  assertValidPosition(end);

  if (!isPlacementShape(shape)) {
    throw new TypeError(`Unknown placement shape: ${String(shape)}.`);
  }

  if (shape === 'single') {
    return [{ x: start.x, y: start.y }];
  }

  if (shape === 'line') {
    return getConnectedLine(start, end);
  }

  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const positions: TilePosition[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      positions.push({ x, y });
    }
  }

  return positions;
}
