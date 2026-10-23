import type { Vector2 } from '../physics/rigidBody';
import type {
  AxisAlignedBounds,
  ProjectileCollisionCandidate
} from './broadphase';

export interface ProjectileImpact {
  readonly projectile: ProjectileCollisionCandidate['projectile'];
  readonly target: ProjectileCollisionCandidate['target'];
  readonly timeOfImpact: number;
  readonly position: Vector2;
  readonly contactPoint: Vector2;
}

function assertBounds(bounds: AxisAlignedBounds): void {
  const values = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];

  if (!values.every(Number.isFinite)) {
    throw new RangeError('Collision bounds must contain finite coordinates.');
  }

  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    throw new RangeError('Collision bounds minimums must not exceed maximums.');
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function segmentAabbTimeOfImpact(
  start: Vector2,
  end: Vector2,
  bounds: AxisAlignedBounds
): number | undefined {
  assertBounds(bounds);
  let firstTime = 0;
  let lastTime = 1;
  const axes = [
    {
      start: start.x,
      delta: end.x - start.x,
      minimum: bounds.minX,
      maximum: bounds.maxX
    },
    {
      start: start.y,
      delta: end.y - start.y,
      minimum: bounds.minY,
      maximum: bounds.maxY
    }
  ];

  for (const axis of axes) {
    if (!Number.isFinite(axis.delta)) {
      throw new RangeError('Collision segment exceeds numeric range.');
    }

    if (axis.delta === 0) {
      if (axis.start < axis.minimum || axis.start > axis.maximum) {
        return undefined;
      }

      continue;
    }

    let entryTime = (axis.minimum - axis.start) / axis.delta;
    let exitTime = (axis.maximum - axis.start) / axis.delta;

    if (!Number.isFinite(entryTime) || !Number.isFinite(exitTime)) {
      throw new RangeError('Collision segment exceeds numeric range.');
    }

    if (entryTime > exitTime) {
      [entryTime, exitTime] = [exitTime, entryTime];
    }

    firstTime = Math.max(firstTime, entryTime);
    lastTime = Math.min(lastTime, exitTime);

    if (firstTime > lastTime) {
      return undefined;
    }
  }

  return firstTime <= 1 ? firstTime : undefined;
}

function segmentCircleTimeOfImpact(
  start: Vector2,
  end: Vector2,
  center: Vector2,
  radius: number
): number | undefined {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const offsetX = start.x - center.x;
  const offsetY = start.y - center.y;
  const quadratic = deltaX * deltaX + deltaY * deltaY;
  const constant = offsetX * offsetX + offsetY * offsetY - radius * radius;

  if (
    ![
      deltaX,
      deltaY,
      offsetX,
      offsetY,
      quadratic,
      constant
    ].every(Number.isFinite)
  ) {
    throw new RangeError('Collision segment exceeds numeric range.');
  }

  if (constant <= 0) {
    return 0;
  }

  if (quadratic === 0) {
    return undefined;
  }

  const linear = 2 * (offsetX * deltaX + offsetY * deltaY);
  const discriminant = linear * linear - 4 * quadratic * constant;

  if (
    !Number.isFinite(quadratic) ||
    !Number.isFinite(linear) ||
    !Number.isFinite(constant) ||
    !Number.isFinite(discriminant)
  ) {
    throw new RangeError('Collision segment exceeds numeric range.');
  }

  const tolerance =
    Number.EPSILON *
    Math.max(1, linear * linear, Math.abs(4 * quadratic * constant)) *
    8;

  if (discriminant < -tolerance) {
    return undefined;
  }

  const entryTime =
    (-linear - Math.sqrt(Math.max(0, discriminant))) / (2 * quadratic);

  return entryTime >= 0 && entryTime <= 1 ? entryTime : undefined;
}

function earliestCircleAabbTimeOfImpact(
  start: Vector2,
  end: Vector2,
  bounds: AxisAlignedBounds,
  radius: number
): number | undefined {
  const impactTimes: number[] = [];
  const addImpactTime = (time: number | undefined): void => {
    if (time !== undefined) {
      impactTimes.push(time);
    }
  };

  addImpactTime(segmentAabbTimeOfImpact(start, end, bounds));
  addImpactTime(
    segmentAabbTimeOfImpact(start, end, {
      minX: bounds.minX - radius,
      minY: bounds.minY,
      maxX: bounds.minX,
      maxY: bounds.maxY
    })
  );
  addImpactTime(
    segmentAabbTimeOfImpact(start, end, {
      minX: bounds.maxX,
      minY: bounds.minY,
      maxX: bounds.maxX + radius,
      maxY: bounds.maxY
    })
  );
  addImpactTime(
    segmentAabbTimeOfImpact(start, end, {
      minX: bounds.minX,
      minY: bounds.minY - radius,
      maxX: bounds.maxX,
      maxY: bounds.minY
    })
  );
  addImpactTime(
    segmentAabbTimeOfImpact(start, end, {
      minX: bounds.minX,
      minY: bounds.maxY,
      maxX: bounds.maxX,
      maxY: bounds.maxY + radius
    })
  );

  for (const corner of [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY }
  ]) {
    addImpactTime(
      segmentCircleTimeOfImpact(start, end, corner, radius)
    );
  }

  return impactTimes.length === 0 ? undefined : Math.min(...impactTimes);
}

function compareIds(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

export function findProjectileImpacts(
  candidates: readonly ProjectileCollisionCandidate[]
): ProjectileImpact[] {
  const impacts: ProjectileImpact[] = [];
  const seenPairs = new Map<number, Set<string>>();

  for (const candidate of candidates) {
    const { projectile, target } = candidate;

    if (projectile.ownerId === target.ownerId) {
      continue;
    }

    const seenTargetIds =
      seenPairs.get(projectile.id) ?? new Set<string>();

    if (seenTargetIds.has(target.id)) {
      continue;
    }

    seenTargetIds.add(target.id);
    seenPairs.set(projectile.id, seenTargetIds);
    assertBounds(target.bounds);

    if (
      !Number.isFinite(projectile.collisionRadius) ||
      projectile.collisionRadius < 0
    ) {
      throw new RangeError(
        'Projectile collision radius must be finite and non-negative.'
      );
    }

    const positions = [
      projectile.previousPosition.x,
      projectile.previousPosition.y,
      projectile.position.x,
      projectile.position.y
    ];

    if (!positions.every(Number.isFinite)) {
      throw new RangeError('Projectile positions must be finite.');
    }

    const timeOfImpact = earliestCircleAabbTimeOfImpact(
      projectile.previousPosition,
      projectile.position,
      target.bounds,
      projectile.collisionRadius
    );

    if (timeOfImpact === undefined) {
      continue;
    }

    const position = {
      x:
        projectile.previousPosition.x +
        (projectile.position.x - projectile.previousPosition.x) *
          timeOfImpact,
      y:
        projectile.previousPosition.y +
        (projectile.position.y - projectile.previousPosition.y) *
          timeOfImpact
    };

    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new RangeError('Projectile impact position exceeds numeric range.');
    }

    impacts.push({
      projectile,
      target,
      timeOfImpact,
      position,
      contactPoint: {
        x: clamp(position.x, target.bounds.minX, target.bounds.maxX),
        y: clamp(position.y, target.bounds.minY, target.bounds.maxY)
      }
    });
  }

  impacts.sort(
    (left, right) =>
      left.timeOfImpact - right.timeOfImpact ||
      left.projectile.id - right.projectile.id ||
      compareIds(left.target.id, right.target.id)
  );

  return impacts;
}
