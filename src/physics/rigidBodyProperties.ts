import type { Construction } from '../construction/construction';
import { calculateCenterOfMass } from './centerOfMass';
import { calculateMomentOfInertia } from './momentOfInertia';

export interface RigidBodyProperties {
  readonly mass: number;
  readonly centerOfMass: {
    readonly x: number;
    readonly y: number;
  } | null;
  readonly momentOfInertia: number;
}

export function calculateRigidBodyProperties(
  construction: Construction
): RigidBodyProperties {
  const centerOfMass = calculateCenterOfMass(construction);
  const momentOfInertia = calculateMomentOfInertia(construction);
  const massDifference = Math.abs(
    centerOfMass.totalMass - momentOfInertia.totalMass
  );
  const roundingTolerance =
    Number.EPSILON *
    Math.max(1, centerOfMass.totalMass, momentOfInertia.totalMass) *
    64;

  if (massDifference > roundingTolerance) {
    throw new Error('Rigid body mass properties are inconsistent.');
  }

  return {
    mass: centerOfMass.totalMass,
    centerOfMass: centerOfMass.centerOfMass,
    momentOfInertia: momentOfInertia.momentOfInertia
  };
}
