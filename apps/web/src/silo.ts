import type { Building } from "./types";

export const SILO_BUILDING_DEF_ID = "bdef_silo";

export function isSiloBuilding(building: Pick<Building, "buildingDefId">): boolean {
  return building.buildingDefId === SILO_BUILDING_DEF_ID;
}

export function isSiloBuildingDef(defId: string): boolean {
  return defId === SILO_BUILDING_DEF_ID;
}
