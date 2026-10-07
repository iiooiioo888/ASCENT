import type { Building } from "./types";

export const TRADING_POST_BUILDING_DEF_ID = "bdef_trading_post";

export function isTradingPostBuilding(building: Pick<Building, "buildingDefId">): boolean {
  return building.buildingDefId === TRADING_POST_BUILDING_DEF_ID;
}

export function isTradingPostBuildingDef(defId: string): boolean {
  return defId === TRADING_POST_BUILDING_DEF_ID;
}
