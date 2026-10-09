import type { InvRow } from "./types";

/** 庫存分組（FE-RICH-2）：錠材、糧、中間品、成品、原料。 */
export type InventoryBucket = "ingot" | "grain" | "intermediate" | "finished" | "other";

export const INVENTORY_BUCKET_LABEL: Record<InventoryBucket, string> = {
  ingot: "錠材",
  grain: "糧",
  intermediate: "中間品",
  finished: "成品",
  other: "原料",
};

/** 置頂橫列：結算／口糧類。 */
export const PINNED_INVENTORY_BUCKETS: readonly InventoryBucket[] = ["ingot", "grain"];

const SECTION_BUCKET_ORDER: readonly InventoryBucket[] = ["intermediate", "finished", "other"];

const ITEM_INVENTORY_BUCKET: Record<string, InventoryBucket> = {
  item_copper_ingot: "ingot",
  item_silver_ingot: "ingot",
  item_gold_ingot: "ingot",
  item_iron_ingot: "ingot",
  item_seed_wheat: "grain",
  item_water: "grain",
  item_wheat: "grain",
  item_straw: "grain",
  item_flour: "intermediate",
  item_feed: "intermediate",
  item_dough: "intermediate",
  item_coke: "intermediate",
  item_charcoal: "intermediate",
  item_lime: "intermediate",
  item_acid: "intermediate",
  item_glass: "intermediate",
  item_brick: "intermediate",
  item_plank: "intermediate",
  item_steel: "intermediate",
  item_nails: "intermediate",
  item_wire: "intermediate",
  item_alkali: "intermediate",
  item_steam: "intermediate",
  item_fertilizer: "intermediate",
  item_bread: "finished",
  item_cake: "finished",
  item_egg: "finished",
  item_milk: "finished",
  item_tools: "finished",
  item_gears: "finished",
  item_glassware: "finished",
  item_concrete: "finished",
  item_machine: "finished",
  item_engine: "finished",
};

export function inventoryBucketForItem(itemId: string): InventoryBucket {
  return ITEM_INVENTORY_BUCKET[itemId] ?? "other";
}

export type InventorySection = {
  bucket: InventoryBucket;
  label: string;
  rows: InvRow[];
};

export type InventoryLayout = {
  pinned: InvRow[];
  sections: InventorySection[];
};

/** 將已排序的庫存行拆成置頂＋分組區塊（順序穩定）。 */
export function layoutInventoryRows(rows: InvRow[]): InventoryLayout {
  const byBucket = new Map<InventoryBucket, InvRow[]>();
  for (const row of rows) {
    const bucket = inventoryBucketForItem(row.itemId);
    const list = byBucket.get(bucket);
    if (list) list.push(row);
    else byBucket.set(bucket, [row]);
  }

  const pinned: InvRow[] = [];
  for (const bucket of PINNED_INVENTORY_BUCKETS) {
    const chunk = byBucket.get(bucket);
    if (chunk?.length) pinned.push(...chunk);
    byBucket.delete(bucket);
  }

  const sections: InventorySection[] = [];
  for (const bucket of SECTION_BUCKET_ORDER) {
    const chunk = byBucket.get(bucket);
    if (!chunk?.length) continue;
    sections.push({ bucket, label: INVENTORY_BUCKET_LABEL[bucket], rows: chunk });
    byBucket.delete(bucket);
  }

  return { pinned, sections };
}
