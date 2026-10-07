import { ITEM_GOLD_ID } from "./market-config";

/** 田建築定義 id（擴田目標）。 */
export const FIELD_BUILDING_DEF_ID = "bdef_field";

/** P-D3：倉庫隱藏、不佔建築槽（仍可在 DB／舊檔存在）。 */
export const SILO_BUILDING_DEF_ID = "bdef_silo";

/** LD-D3：玩家田數上限（含開局 1 塊）。 */
export const FIELD_CAP = 2;

/**
 * P-D3／LD-D4：佔槽建築上限（**不含**倉）。
 * 開局 5 座非倉建築＋擴田 1 座 → 6。
 */
export const PLAYER_BUILDING_SLOT_CAP = 6;

/** LD-D2：第 n 塊「加購」田金幣（n 為當前已有田數，1→第二塊田）。 */
export const FIELD_PURCHASE_PRICE_BY_CURRENT_COUNT: Record<number, number> = {
  1: 10,
};

export const LAND_ERROR_COPY = {
  INSUFFICIENT_GOLD: "金幣不足",
  FIELD_AT_CAP: "農田已達上限",
  BUILDING_SLOTS_FULL: "建築欄位已滿",
  FIELD_USE_PURCHASE_API: "請使用 POST /api/v1/buildings/purchase-field 擴田",
  DUPLICATE_BUILDING_DEF: "此建築已存在",
  SILO_PLACEMENT_FORBIDDEN: "倉庫已隱藏，無法放置",
} as const;

export function buildingCountsTowardSlotCap(buildingDefId: string): boolean {
  return buildingDefId !== SILO_BUILDING_DEF_ID;
}

/** 佔用建築槽的實例數（排除倉）。 */
export function countBuildingsOccupyingSlots(buildings: { buildingDefId: string }[]): number {
  return buildings.filter((b) => buildingCountsTowardSlotCap(b.buildingDefId)).length;
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
  /** 佔槽建築數（不含倉）。 */
  slottedBuildingCount: number;
}): { ok: true; priceGold: number } | { ok: false; reason: keyof typeof LAND_ERROR_COPY } {
  if (input.fieldCount >= FIELD_CAP) {
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

export function allowsAnotherInstanceOfDef(buildingDefId: string, existingCount: number): boolean {
  if (buildingDefId === FIELD_BUILDING_DEF_ID) {
    return existingCount < FIELD_CAP;
  }
  return existingCount < 1;
}

export { ITEM_GOLD_ID };
