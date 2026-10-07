import { isSiloBuilding } from "./silo";
import type { Building } from "./types";

/** Stop is only valid while production is in progress (backend `stop` expects running). */
export function canStopBuilding(status: string): boolean {
  return status === "running";
}

/** Silo has no allowed rules in MVP; never expose start/stop/collect (legacy card mode included). */
export function showProductionActionButtons(building: Pick<Building, "buildingDefId">): boolean {
  return !isSiloBuilding(building);
}
