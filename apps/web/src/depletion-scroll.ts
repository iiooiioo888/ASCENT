import {
  FIELD_BUILDING_DEF_ID,
  METHOD_SAVE_SEED_ID,
  TRADING_POST_BUILDING_DEF_ID,
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

/** v1.1：開局預放水井；UI 唔再顯示未放置水井空地，捲動僅指向已放水井卡。 */
export function resolveWellScrollAnchorId(buildings: Building[]): string | null {
  const placed = buildings.find((b) => b.buildingDefId === WELL_BUILDING_DEF_ID);
  return placed ? buildingScrollAnchorId(placed.id) : null;
}

/** 開局預放建築：唔顯示「空地 · 可放置…」卡（v1.1 水井、v1.2 商行）。 */
export function isPreplacedBuildingPlotHidden(buildingDefId: string): boolean {
  return buildingDefId === WELL_BUILDING_DEF_ID || buildingDefId === TRADING_POST_BUILDING_DEF_ID;
}

/** @deprecated use {@link isPreplacedBuildingPlotHidden} */
export function isWellPlacementUiHidden(buildingDefId: string): boolean {
  return isPreplacedBuildingPlotHidden(buildingDefId);
}

/** v1.2：捲動至已放莊外商行建築卡；未放則 no-op（UI 唔提供放置）。 */
export function resolveTradingPostScrollAnchorId(buildings: Building[]): string | null {
  const placed = buildings.find((b) => b.buildingDefId === TRADING_POST_BUILDING_DEF_ID);
  return placed ? buildingScrollAnchorId(placed.id) : null;
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
