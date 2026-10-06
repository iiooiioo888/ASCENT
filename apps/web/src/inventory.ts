import { formatQuantity } from "./format";
import { ITEM_META, itemLabel } from "./meta";
import type { InvRow } from "./types";

export function inventoryQtyMap(inventory: InvRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of inventory) {
    map.set(row.itemId, Number(row.quantity));
  }
  return map;
}

export function canAffordInputs(
  stock: Map<string, number>,
  inputs: { item_id: string; qty: number }[],
): boolean {
  for (const io of inputs) {
    const have = stock.get(io.item_id) ?? 0;
    if (have + 1e-9 < io.qty) return false;
  }
  return true;
}

export type InputAvailability = {
  item_id: string;
  need: number;
  have: number;
  short: boolean;
};

export function inputAvailability(
  stock: Map<string, number>,
  inputs: { item_id: string; qty: number }[],
): InputAvailability[] {
  return inputs.map((io) => {
    const have = stock.get(io.item_id) ?? 0;
    return {
      item_id: io.item_id,
      need: io.qty,
      have,
      short: have + 1e-9 < io.qty,
    };
  });
}

/** Display「💧水 0.5／1」for shortage rows (have／need). */
export function fmtInputHaveNeed(row: InputAvailability): string {
  const icon = ITEM_META[row.item_id]?.icon ?? "";
  const name = itemLabel(row.item_id);
  return `${icon}${name} ${formatQuantity(row.have)}／${formatQuantity(row.need)}`.trim();
}
