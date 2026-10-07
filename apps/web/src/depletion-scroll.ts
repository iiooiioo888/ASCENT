import {
  FIELD_BUILDING_DEF_ID,
  METHOD_SAVE_SEED_ID,
  WELL_BUILDING_DEF_ID,
} from "./resource-loop-copy";
import type { Building } from "./types";

export const SCROLL_HIGHLIGHT_MS = 2400;

export function buildingScrollAnchorId(buildingId: string): string {
  return `building-${buildingId}`;
}

export function unplacedPlotAnchorId(buildingDefId: string): string {
  return `plot-unplaced-${buildingDefId}`;
}

/** Scroll target for「用水井汲水」— placed well only (v1.1: well is pre-placed at game start). */
export function resolveWellScrollAnchorId(buildings: Building[]): string | undefined {
  const placed = buildings.find((b) => b.buildingDefId === WELL_BUILDING_DEF_ID);
  return placed ? buildingScrollAnchorId(placed.id) : undefined;
}

export function findFieldBuilding(buildings: Building[]): Building | undefined {
  return buildings.find((b) => b.buildingDefId === FIELD_BUILDING_DEF_ID);
}

/** Picks save-seed on the field when the method exists in allowed options. */
export function pickSaveSeedMethodId(
  field: Building | undefined,
  methodsByRule: Map<string, { id: string }[]>,
): string | undefined {
  if (!field) return undefined;
  const allowed = field.buildingDef.allowedRuleIds ?? [];
  const options = allowed.flatMap((rid) => methodsByRule.get(rid) ?? []);
  return options.some((m) => m.id === METHOD_SAVE_SEED_ID) ? METHOD_SAVE_SEED_ID : undefined;
}
