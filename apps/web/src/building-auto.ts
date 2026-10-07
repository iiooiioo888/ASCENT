import { defaultAutoMethodIdForBuilding } from "@ascent/shared";
import type { Building } from "./types";

/** 田／井／磨／爐等有預設主配方的建築才顯示「自動」掣（商行、倉除外）。 */
export function showBuildingAutoToggle(building: Pick<Building, "buildingDefId">): boolean {
  return defaultAutoMethodIdForBuilding(building.buildingDefId) !== null;
}

export function buildingAutoPendingKey(buildingId: string): string {
  return `auto:${buildingId}`;
}

export function isBuildingAutoEnabled(building: Pick<Building, "autoEnabled">): boolean {
  return building.autoEnabled === true;
}
