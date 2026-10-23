import type { ResourceType } from '../core/tiles';
import type { ResourceInventory, ResourceTransferResult } from '../mining/resourceLoot';
import type { DockingSystem } from './docking';
import type { Station } from './station';

export type DockedResourceTransferResult =
  | ResourceTransferResult
  | { readonly status: 'not-docked' }
  | {
      readonly status: 'wrong-station';
      readonly dockedStationId: string;
    };

export function transferResourcesWhileDocked(
  docking: DockingSystem,
  shipId: string,
  station: Station,
  shipInventory: ResourceInventory,
  resourceType: ResourceType,
  amount: number
): DockedResourceTransferResult {
  const connection = docking.getConnection(shipId);

  if (connection === undefined) {
    return { status: 'not-docked' };
  }

  if (connection.stationId !== station.id) {
    return {
      status: 'wrong-station',
      dockedStationId: connection.stationId
    };
  }

  return shipInventory.transferTo(station.inventory, resourceType, amount);
}
