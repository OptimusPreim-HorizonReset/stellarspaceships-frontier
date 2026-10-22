export const POWER_PRIORITY_ORDER = [
  'lifeSupport',
  'propulsion',
  'shields',
  'weapons',
  'industry',
  'comfort'
] as const;

export type PowerPriority = (typeof POWER_PRIORITY_ORDER)[number];

const knownPriorities = new Set<string>(POWER_PRIORITY_ORDER);

export function isPowerPriority(value: unknown): value is PowerPriority {
  return typeof value === 'string' && knownPriorities.has(value);
}
