import { FIELD_BUILDING_DEF_ID } from "./resource-loop-copy";
import type { Building } from "./types";

/** 田建築 id 穩定排序（多田列表唔隨 poll 亂序）。 */
export function sortedFieldBuildingIds(buildings: Building[]): string[] {
  return buildings
    .filter((b) => b.buildingDefId === FIELD_BUILDING_DEF_ID)
    .map((b) => b.id)
    .sort((a, b) => a.localeCompare(b));
}

/** 多於一塊田時顯示「田 1」「田 2」；單田回傳 undefined 沿用原名。 */
export function fieldPlotTitle(buildings: Building[], buildingId: string): string | undefined {
  const ids = sortedFieldBuildingIds(buildings);
  if (ids.length <= 1) return undefined;
  const index = ids.indexOf(buildingId);
  if (index < 0) return undefined;
  return `田 ${index + 1}`;
}

export function isFieldBuilding(building: Building): boolean {
  return building.buildingDefId === FIELD_BUILDING_DEF_ID;
}
