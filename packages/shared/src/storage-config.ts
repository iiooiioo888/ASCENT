import { ITEM_GOLD_ID, ITEM_SETTLEMENT_CURRENCY_ID } from "./market-config";

/** 倉儲格數＝建築槽／田終局上限：每種非貨幣物品佔 1 格。 */
export const STORAGE_STACK_CAP = 12;

export const STORAGE_FULL_MESSAGE = "倉儲已滿，賣掉或加工後再收";

const EXEMPT = new Set([ITEM_SETTLEMENT_CURRENCY_ID, ITEM_GOLD_ID]);

export function isStorageExemptItem(itemId: string): boolean {
  return EXEMPT.has(itemId);
}

export type StorageRow = { itemId: string; quantity: number };

export function countStorageStacks(rows: StorageRow[]): number {
  let n = 0;
  for (const row of rows) {
    if (isStorageExemptItem(row.itemId)) continue;
    if (row.quantity > 1e-9) n += 1;
  }
  return n;
}

export function wouldExceedStorageCap(
  rows: StorageRow[],
  gain: Record<string, number>,
  cap = STORAGE_STACK_CAP,
): boolean {
  const qty = new Map(rows.map((row) => [row.itemId, row.quantity]));
  for (const [itemId, add] of Object.entries(gain)) {
    if (!Number.isFinite(add) || add <= 0) continue;
    qty.set(itemId, (qty.get(itemId) ?? 0) + add);
  }
  return countStorageStacks([...qty.entries()].map(([itemId, quantity]) => ({ itemId, quantity }))) > cap;
}

export function storageFillRatio(used: number, cap = STORAGE_STACK_CAP): number {
  if (cap <= 0) return 0;
  return used / cap;
}
