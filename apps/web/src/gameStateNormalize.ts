import { sortBuildingDefs, sortBuildings } from "./buildingSort";
import { sortInventoryRows } from "./inventorySort";
import type { GameState } from "./types";

/** Deterministic lists after every poll merge (J-UX-1b). */
export function normalizeGameState(state: GameState): GameState {
  return {
    ...state,
    buildings: sortBuildings(state.buildings),
    inventory: sortInventoryRows(state.inventory),
    buildingDefs: sortBuildingDefs(state.buildingDefs),
  };
}
