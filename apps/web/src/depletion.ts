import { canAffordInputs, inventoryQtyMap } from "./inventory";
import type { Building, InvRow, Method } from "./types";

export function buildingMethodOptions(
  building: Building,
  methodsByRule: Map<string, Method[]>,
): Method[] {
  const allowed = building.buildingDef.allowedRuleIds ?? [];
  return allowed.flatMap((rid) => methodsByRule.get(rid) ?? []);
}

/** True if any building is running/ready or any idle method can start with current stock. */
export function hasAffordableStart(
  buildings: Building[],
  inventory: InvRow[],
  methodsByRule: Map<string, Method[]>,
): boolean {
  const stock = inventoryQtyMap(inventory);

  for (const building of buildings) {
    if (building.status === "running" || building.status === "ready") return true;

    for (const method of buildingMethodOptions(building, methodsByRule)) {
      if (canAffordInputs(stock, method.inputs)) return true;
    }
  }

  return false;
}

/**
 * U6: show depletion empty state when every placed building lacks affordable methods
 * and nothing is running or ready to collect.
 */
export function isResourceDepleted(
  buildings: Building[],
  inventory: InvRow[],
  methodsByRule: Map<string, Method[]>,
): boolean {
  if (buildings.length === 0) return false;
  return !hasAffordableStart(buildings, inventory, methodsByRule);
}
