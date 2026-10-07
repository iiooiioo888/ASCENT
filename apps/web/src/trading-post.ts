import type { Building } from "./types";
import { TRADING_POST_BUILDING_DEF_ID } from "./resource-loop-copy";

export function isTradingPostBuilding(building: Pick<Building, "buildingDefId">): boolean {
  return building.buildingDefId === TRADING_POST_BUILDING_DEF_ID;
}

export function isTradingPostBuildingDef(defId: string): boolean {
  return defId === TRADING_POST_BUILDING_DEF_ID;
}
