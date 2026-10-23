import { Construction } from '../construction/construction';
import { CHUNK_SIZE } from '../core/config';

export const GATE_C_SCALE_PROFILE = Object.freeze({
  tileCount: 3000,
  columns: 60,
  rows: 50,
  targetFps: 60,
  warmupFrames: 30,
  measuredFrames: 180,
  timeoutMs: 30_000,
  projectileDamage: 40,
  projectileSpeed: 64,
  projectileRadius: 0.15
});

export function createGateCCombatConstruction(): Construction {
  const construction = new Construction('gate-c-sf191-3000-ship');

  for (let y = 0; y < GATE_C_SCALE_PROFILE.rows; y += 1) {
    for (let x = 0; x < GATE_C_SCALE_PROFILE.columns; x += 1) {
      construction.placeTile({ x, y }, 'hull');
    }
  }

  for (const reactorPosition of [
    { x: 0, y: 0 },
    { x: CHUNK_SIZE, y: 0 },
    { x: 0, y: CHUNK_SIZE },
    { x: CHUNK_SIZE, y: CHUNK_SIZE }
  ]) {
    construction.placeTile(reactorPosition, 'reactor');
  }

  construction.placeTile({ x: 15, y: 49 }, 'thruster', 'north');
  construction.placeTile({ x: 45, y: 49 }, 'thruster', 'north');

  if (construction.tileCount !== GATE_C_SCALE_PROFILE.tileCount) {
    throw new Error('SF-191 workload must contain exactly 3,000 tiles.');
  }

  return construction;
}
