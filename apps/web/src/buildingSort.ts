import type { Building } from "./types";

/**
 * Settlement card order: production chain first, then support buildings (J-UX-1b).
 * Tie-break: stable `building.id` lexicographic — never API row order or status.
 */
export const BUILDING_DEF_DISPLAY_ORDER: readonly string[] = [
  "bdef_field",
  "bdef_mill",
  "bdef_ranch",
  "bdef_oven",
  "bdef_well",
  "bdef_silo",
  "bdef_trading_post",
];

const DEF_ORDER = new Map(BUILDING_DEF_DISPLAY_ORDER.map((id, index) => [id, index]));

function buildingDefSortKey(buildingDefId: string): number {
  const idx = DEF_ORDER.get(buildingDefId);
  return idx !== undefined ? idx : BUILDING_DEF_DISPLAY_ORDER.length;
}

/** Stable sort for placed buildings across every `/state` poll. */
export function sortBuildings(buildings: Building[]): Building[] {
  return [...buildings].sort((a, b) => {
    const delta = buildingDefSortKey(a.buildingDefId) - buildingDefSortKey(b.buildingDefId);
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  });
}

export function sortBuildingDefIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const delta = buildingDefSortKey(a) - buildingDefSortKey(b);
    if (delta !== 0) return delta;
    return a.localeCompare(b);
  });
}

export function sortBuildingDefs<T extends { id: string }>(defs: T[]): T[] {
  return [...defs].sort((a, b) => {
    const delta = buildingDefSortKey(a.id) - buildingDefSortKey(b.id);
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  });
}
