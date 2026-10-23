import type { Construction } from '../construction/construction';
import type { TilePosition } from '../core/coordinates';
import type { Tile } from '../core/tiles';
import type { ProjectileImpact } from './narrowphase';

export interface ProjectileTileTarget {
  readonly id: string;
  readonly construction: Construction;
  readonly position: TilePosition;
}

export type LocalDamageResult =
  | {
      readonly status: 'miss';
      readonly position: TilePosition;
    }
  | {
      readonly status: 'damaged';
      readonly position: TilePosition;
      readonly tileId: number;
      readonly damageApplied: number;
      readonly remainingHitPoints: number;
    }
  | {
      readonly status: 'destroyed';
      readonly position: TilePosition;
      readonly destroyedTile: Readonly<Tile>;
      readonly damageApplied: number;
      readonly remainingHitPoints: 0;
    }

    export function applyProjectileImpactDamage(
      impact: ProjectileImpact,
      target: ProjectileTileTarget
    ): LocalDamageResult {
      if (
        impact.target.id !== target.id ||
        impact.target.ownerId !== target.construction.id
      ) {
        throw new TypeError('Projectile impact does not match the tile target.');
      }

      return applyLocalDamage(
        target.construction,
        target.position,
        impact.projectile.damage
      );
    }

    export function applyLocalDamage(
  construction: Construction,
  position: TilePosition,
  damage: number
): LocalDamageResult {
  if (!Number.isFinite(damage) || damage <= 0) {
    throw new RangeError('Damage must be finite and positive.');
  }

  const tile = construction.getTile(position);

  if (tile === undefined) {
    return { status: 'miss', position: { ...position } };
  }

  const definition = construction.tileRegistry.get(tile.type);

  if (definition === undefined) {
    throw new RangeError(`Tile type is not registered: ${tile.type}.`);
  }

  if (
    !Number.isFinite(tile.hp) ||
    tile.hp < 0 ||
    tile.hp > definition.maxHp
  ) {
    throw new RangeError(`Invalid HP for tile ID ${tile.id}.`);
  }

  const damageApplied = Math.min(damage, tile.hp);
  const remainingHitPoints = tile.hp - damageApplied;

  if (damageApplied > 0 && remainingHitPoints === tile.hp) {
    throw new RangeError('Damage is too small to change tile hit points.');
  }

  if (remainingHitPoints > 0) {
    tile.hp = remainingHitPoints;

    return {
      status: 'damaged',
      position: { ...position },
      tileId: tile.id,
      damageApplied,
      remainingHitPoints
    };
  }

  tile.hp = 0;
  const destroyedTile = construction.removeTile(position);

  if (destroyedTile === undefined) {
    throw new Error('Tile disappeared while applying local damage.');
  }

  return {
    status: 'destroyed',
    position: { ...position },
    destroyedTile: { ...destroyedTile },
    damageApplied,
    remainingHitPoints: 0
  };
}
