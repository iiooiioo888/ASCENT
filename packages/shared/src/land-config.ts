import { INDUSTRY_BUILDING_DEF_IDS } from "./industry-catalog";
import { ITEM_SETTLEMENT_CURRENCY_ID } from "./market-config";
import { FIELD_CAP_UNLOCK_BREAD_QTY } from "./play-loop-config";

/** 田建築定義 id（擴田目標）。 */
export const FIELD_BUILDING_DEF_ID = "bdef_field";

/** P-D3：倉庫隱藏、不佔建築槽（仍可在 DB／舊檔存在）。 */
export const SILO_BUILDING_DEF_ID = "bdef_silo";

/** 早期硬瓶頸：未達麵包里程碑前最多 2 塊田。 */
export const FIELD_EARLY_CAP = 2;
/** 終局上限與建築槽相等：每塊田都在擠壓 12 格。 */
export const FIELD_CAP = 12;

export const FIELD_CULTIVATION_ROTATION = "rotation";
export const FIELD_CULTIVATION_INTENSIVE = "intensive";
export const FIELD_INTENSIVE_FOOTPRINT = 2;
export const FIELD_INTENSIVE_OUTPUT_FACTOR = 1.3;

export type FieldCultivation = typeof FIELD_CULTIVATION_ROTATION | typeof FIELD_CULTIVATION_INTENSIVE;

/**
 * P-D3／LD-D4：佔槽建築上限（**不含**倉，亦**不含**產業擴充建築）。
 * P4-S1：上限 12（開局 5＋擴田與牧場等農業建築）。
 * P4 礦場（`bdef_mine`）、冶煉廠（`bdef_smelter`）佔槽；產業擴充礦坑／冶煉爐等不佔此槽。
 */
export const PLAYER_BUILDING_SLOT_CAP = 12;

/** 第 n 塊「加購」田金幣（n 為當前已有田數，1→第二塊田）。 */
export const FIELD_PURCHASE_PRICE_BY_CURRENT_COUNT: Record<number, number> = {
  1: 10,
  2: 18,
  3: 28,
  4: 40,
  5: 54,
  6: 70,
  7: 88,
  8: 108,
  9: 130,
  10: 154,
  11: 180,
};

export const LAND_ERROR_COPY = {
  INSUFFICIENT_GOLD: "銅錠不足",
  FIELD_AT_CAP: "農田已達上限",
  BUILDING_SLOTS_FULL: "建築欄位已滿",
  FIELD_USE_PURCHASE_API: "請使用 POST /api/v1/buildings/purchase-field 擴田",
  DUPLICATE_BUILDING_DEF: "此建築已存在",
  SILO_PLACEMENT_FORBIDDEN: "倉庫已隱藏，無法放置",
  CULTIVATION_BUSY: "運作中無法改耕作",
  UNKNOWN_CULTIVATION: "未知耕作方式",
} as const;

const INDUSTRY_SLOT_EXEMPT = new Set<string>(INDUSTRY_BUILDING_DEF_IDS);

export type SlotOccupant = {
  buildingDefId: string;
  specialization?: string | null;
};

export function parseFieldCultivation(raw: string | null | undefined): FieldCultivation {
  return raw === FIELD_CULTIVATION_INTENSIVE ? FIELD_CULTIVATION_INTENSIVE : FIELD_CULTIVATION_ROTATION;
}

export function fieldCultivationOutputFactor(mode: string | null | undefined): number {
  return parseFieldCultivation(mode) === FIELD_CULTIVATION_INTENSIVE ? FIELD_INTENSIVE_OUTPUT_FACTOR : 1;
}

export function fieldCapForLifetime(lifetimeCollected: Record<string, number>): number {
  if ((lifetimeCollected.item_bread ?? 0) + 1e-9 >= FIELD_CAP_UNLOCK_BREAD_QTY) return FIELD_CAP;
  return FIELD_EARLY_CAP;
}

export function buildingCountsTowardSlotCap(buildingDefId: string): boolean {
  if (buildingDefId === SILO_BUILDING_DEF_ID) return false;
  if (INDUSTRY_SLOT_EXEMPT.has(buildingDefId)) return false;
  return true;
}

export function buildingSlotFootprint(building: SlotOccupant): number {
  if (!buildingCountsTowardSlotCap(building.buildingDefId)) return 0;
  if (
    building.buildingDefId === FIELD_BUILDING_DEF_ID &&
    parseFieldCultivation(building.specialization) === FIELD_CULTIVATION_INTENSIVE
  ) {
    return FIELD_INTENSIVE_FOOTPRINT;
  }
  return 1;
}

/** 只有會佔農業槽的建築才受上限擋住；產業擴充在槽滿後仍可各放 1 座。 */
export function isPlacementBlockedBySlotCap(buildingDefId: string, existing: SlotOccupant[]): boolean {
  if (!buildingCountsTowardSlotCap(buildingDefId)) return false;
  return countBuildingsOccupyingSlots(existing) >= PLAYER_BUILDING_SLOT_CAP;
}

/** 佔用建築槽數（排除倉；密集田佔 2）。 */
export function countBuildingsOccupyingSlots(buildings: SlotOccupant[]): number {
  return buildings.reduce((sum, b) => sum + buildingSlotFootprint(b), 0);
}

export function countPlayerFields(buildings: { buildingDefId: string }[]): number {
  return buildings.filter((b) => b.buildingDefId === FIELD_BUILDING_DEF_ID).length;
}

export function fieldPurchasePriceGold(currentFieldCount: number): number | null {
  if (currentFieldCount >= FIELD_CAP) return null;
  const price = FIELD_PURCHASE_PRICE_BY_CURRENT_COUNT[currentFieldCount];
  return typeof price === "number" && price > 0 ? price : null;
}

export function canPurchaseField(input: {
  fieldCount: number;
  /** 佔槽建築數（不含倉；含密集田的 2 格）。 */
  slottedBuildingCount: number;
  /** 有效田上限（早期 2／解鎖後 12）。 */
  fieldCap?: number;
}): { ok: true; priceGold: number } | { ok: false; reason: keyof typeof LAND_ERROR_COPY } {
  const cap = input.fieldCap ?? FIELD_EARLY_CAP;
  if (input.fieldCount >= cap) {
    return { ok: false, reason: "FIELD_AT_CAP" };
  }
  if (input.slottedBuildingCount >= PLAYER_BUILDING_SLOT_CAP) {
    return { ok: false, reason: "BUILDING_SLOTS_FULL" };
  }
  const priceGold = fieldPurchasePriceGold(input.fieldCount);
  if (priceGold == null) {
    return { ok: false, reason: "FIELD_AT_CAP" };
  }
  return { ok: true, priceGold };
}

export function canSwitchFieldToIntensive(input: {
  status: string;
  currentMode: string | null | undefined;
  slottedBuildingCount: number;
}): { ok: true } | { ok: false; reason: keyof typeof LAND_ERROR_COPY } {
  if (input.status !== "idle") return { ok: false, reason: "CULTIVATION_BUSY" };
  if (parseFieldCultivation(input.currentMode) === FIELD_CULTIVATION_INTENSIVE) return { ok: true };
  const extra = FIELD_INTENSIVE_FOOTPRINT - 1;
  if (input.slottedBuildingCount + extra > PLAYER_BUILDING_SLOT_CAP) {
    return { ok: false, reason: "BUILDING_SLOTS_FULL" };
  }
  return { ok: true };
}

export function allowsAnotherInstanceOfDef(
  buildingDefId: string,
  existingCount: number,
  fieldCap = FIELD_EARLY_CAP,
): boolean {
  if (buildingDefId === FIELD_BUILDING_DEF_ID) {
    return existingCount < fieldCap;
  }
  return existingCount < 1;
}

export { ITEM_SETTLEMENT_CURRENCY_ID };
