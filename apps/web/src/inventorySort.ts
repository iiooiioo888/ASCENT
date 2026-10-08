import type { InvRow } from "./types";

/**
 * 可玩目錄顯示順序（農業在前，其後依產業鏈）。各產業選項卡只顯示自己的產品。
 * TODO(product): 待確認 — 若 API 日後回傳排序或顯示名，改由後端／catalog 單一來源。
 */
export const INVENTORY_DISPLAY_ORDER: readonly string[] = [
  "item_seed_wheat",
  "item_water",
  "item_wheat",
  "item_straw",
  "item_flour",
  "item_feed",
  "item_egg",
  "item_milk",
  "item_dough",
  "item_bread",
  "item_iron_ore",
  "item_copper_ore",
  "item_coal",
  "item_stone",
  "item_clay",
  "item_sand",
  "item_sulfur",
  "item_salt",
  "item_log",
  "item_iron_ingot",
  "item_copper_ingot",
  "item_coke",
  "item_charcoal",
  "item_brick",
  "item_glass",
  "item_lime",
  "item_plank",
  "item_acid",
  "item_steel",
  "item_nails",
  "item_wire",
  "item_tools",
  "item_gears",
  "item_glassware",
  "item_concrete",
  "item_alkali",
  "item_steam",
  "item_fertilizer",
  "item_machine",
  "item_engine",
  "item_gold",
];

const ORDER_INDEX = new Map(INVENTORY_DISPLAY_ORDER.map((id, index) => [id, index]));

function sortKey(itemId: string): number {
  const idx = ORDER_INDEX.get(itemId);
  if (idx !== undefined) return idx;
  return INVENTORY_DISPLAY_ORDER.length;
}

/** Stable sort: known DAG ids first, then lexicographic fallback. */
export function sortInventoryRows(rows: InvRow[]): InvRow[] {
  return [...rows].sort((a, b) => {
    const delta = sortKey(a.itemId) - sortKey(b.itemId);
    if (delta !== 0) return delta;
    return a.itemId.localeCompare(b.itemId);
  });
}
