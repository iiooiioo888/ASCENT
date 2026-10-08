import type { InvRow } from "./types";

/**
 * MVP agriculture slice DAG display order (T → P).
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
