import {
  isPowerPriority,
  POWER_PRIORITY_ORDER
} from './powerPriorities';
import type { PowerPriority } from './powerPriorities';

export interface PowerDemand {
  readonly consumerId: string;
  readonly priority: PowerPriority;
  readonly requestedPower: number;
}

export interface ConsumerPowerAllocation {
  readonly consumerId: string;
  readonly priority: PowerPriority;
  readonly requestedPower: number;
  readonly allocatedPower: number;
}

export interface PowerAllocationReport {
  readonly availablePower: number;
  readonly requestedPower: number;
  readonly allocatedPower: number;
  readonly unusedPower: number;
  readonly allocations: readonly ConsumerPowerAllocation[];
}

function compareConsumerIds(left: PowerDemand, right: PowerDemand): number {
  if (left.consumerId < right.consumerId) {
    return -1;
  }

  if (left.consumerId > right.consumerId) {
    return 1;
  }

  return 0;
}

export function allocateChunkPower(
  availablePower: number,
  demands: readonly PowerDemand[]
): PowerAllocationReport {
  if (!Number.isFinite(availablePower) || availablePower < 0) {
    throw new RangeError('Available power must be a non-negative finite number.');
  }

  const demandIds = new Set<string>();
  const demandsByPriority = new Map<PowerPriority, PowerDemand[]>(
    POWER_PRIORITY_ORDER.map((priority) => [priority, []])
  );
  let requestedPower = 0;

  for (const demand of demands) {
    if (
      typeof demand.consumerId !== 'string' ||
      demand.consumerId.trim().length === 0
    ) {
      throw new TypeError('Power consumer ID must not be empty.');
    }

    if (demandIds.has(demand.consumerId)) {
      throw new TypeError(`Duplicate power consumer ID: ${demand.consumerId}.`);
    }

    if (!isPowerPriority(demand.priority)) {
      throw new TypeError(`Unknown power priority: ${String(demand.priority)}.`);
    }

    if (!isPowerPriority(demand.priority)) {
      throw new TypeError(`Unknown power priority: ${String(demand.priority)}.`);
    }

    if (
      !Number.isFinite(demand.requestedPower) ||
      demand.requestedPower < 0
    ) {
      throw new RangeError(
        `Invalid power demand for consumer ${demand.consumerId}.`
      );
    }

    const updatedRequestedPower = requestedPower + demand.requestedPower;

    if (!Number.isFinite(updatedRequestedPower)) {
      throw new RangeError('Total requested power overflow.');
    }

    requestedPower = updatedRequestedPower;
    demandIds.add(demand.consumerId);
    const priorityGroup = demandsByPriority.get(demand.priority);

    if (priorityGroup === undefined) {
      throw new Error(`Missing power priority group: ${demand.priority}.`);
    }

    priorityGroup.push(demand);
  }

  const allocatedById = new Map<string, number>(
    demands.map((demand) => [demand.consumerId, 0])
  );
  let remainingPower = availablePower;

  for (const priority of POWER_PRIORITY_ORDER) {
    const priorityDemands = demandsByPriority.get(priority);

    if (priorityDemands === undefined) {
      throw new Error(`Missing power priority group: ${priority}.`);
    }

    const sortedDemands = [...priorityDemands].sort(compareConsumerIds);
    const requestedAtPriority = sortedDemands.reduce(
      (total, demand) => total + demand.requestedPower,
      0
    );

    if (!Number.isFinite(requestedAtPriority)) {
      throw new RangeError(`Power demand overflow at priority ${priority}.`);
    }

    if (requestedAtPriority === 0) {
      continue;
    }

    const allocationRatio = Math.min(
      1,
      remainingPower / requestedAtPriority
    );

    for (const demand of sortedDemands) {
      const allocatedToConsumer =
        demand.requestedPower * allocationRatio;
      allocatedById.set(demand.consumerId, allocatedToConsumer);
    }

    remainingPower = Math.max(
      0,
      remainingPower - requestedAtPriority * allocationRatio
    );

    if (allocationRatio < 1) {
      break;
    }
  }

  const allocations = [...demands]
    .sort((left, right) => {
      const priorityDifference =
        POWER_PRIORITY_ORDER.indexOf(left.priority) -
        POWER_PRIORITY_ORDER.indexOf(right.priority);

      return priorityDifference || compareConsumerIds(left, right);
    })
    .map((demand): ConsumerPowerAllocation => {
      const allocated = allocatedById.get(demand.consumerId);

      if (allocated === undefined) {
        throw new Error(
          `Missing power allocation for consumer ${demand.consumerId}.`
        );
      }

      return {
        consumerId: demand.consumerId,
        priority: demand.priority,
        requestedPower: demand.requestedPower,
        allocatedPower: allocated
      };
    });
  const allocatedPower = availablePower - remainingPower;

  return {
    availablePower,
    requestedPower,
    allocatedPower,
    unusedPower: remainingPower,
    allocations
  };
}
