/** 留種代數：買來的種是第 0 代；自留種每代產出加成，有上限。禁止隨機源。 */

export const SEED_WHEAT_ITEM_ID = "item_seed_wheat";
export const WHEAT_ITEM_ID = "item_wheat";
export const GROW_WHEAT_RULE_ID = "rule_grow_wheat";
export const SAVE_SEED_RULE_ID = "rule_save_seed";

/** 自留種每代小麥產出 +20%（落在 15–25% 建議帶）。 */
export const SEED_GENERATION_BONUS = 0.2;
/** 代數上限；之後加成不再漲，避免通膨。 */
export const SEED_GENERATION_MAX = 5;
/** 商行買入的種子代數。 */
export const MARKET_SEED_GENERATION = 0;

export type SeedLineageMap = Record<string, number>;

export function emptySeedLineage(): SeedLineageMap {
  return { [SEED_WHEAT_ITEM_ID]: 0, [WHEAT_ITEM_ID]: 0 };
}

export function clampGeneration(gen: number): number {
  if (!Number.isFinite(gen) || gen < 0) return 0;
  return Math.min(SEED_GENERATION_MAX, gen);
}

export function generationBonusFactor(generation: number): number {
  return 1 + clampGeneration(generation) * SEED_GENERATION_BONUS;
}

export function scaleQtyDeterministic(qty: number, factor: number): number {
  if (factor === 1) return qty;
  return Math.round(qty * factor * 1000) / 1000;
}

export function mixGeneration(qtyA: number, genA: number, qtyB: number, genB: number): number {
  const a = Math.max(0, qtyA);
  const b = Math.max(0, qtyB);
  const total = a + b;
  if (total <= 1e-9) return 0;
  return clampGeneration((a * clampGeneration(genA) + b * clampGeneration(genB)) / total);
}

/** 用當時小麥堆的代數留種：下一代種子。 */
export function nextSavedSeedGeneration(wheatGeneration: number): number {
  return clampGeneration(Math.floor(wheatGeneration + 1e-9) + 1);
}

export function applyOutputFactor(
  outputs: Record<string, number>,
  factor: number,
): Record<string, number> {
  if (factor === 1) return { ...outputs };
  const next: Record<string, number> = {};
  for (const [id, qty] of Object.entries(outputs)) {
    next[id] = scaleQtyDeterministic(qty, factor);
  }
  return next;
}

/** 只放大麥；秸稈維持目錄基數。 */
export function applySeedGenerationToGrowOutputs(
  outputs: Record<string, number>,
  generation: number,
): Record<string, number> {
  const factor = generationBonusFactor(generation);
  if (factor === 1) return { ...outputs };
  const next = { ...outputs };
  if (next[WHEAT_ITEM_ID] != null) {
    next[WHEAT_ITEM_ID] = scaleQtyDeterministic(next[WHEAT_ITEM_ID], factor);
  }
  return next;
}

export function lineageFromUnknown(raw: unknown): SeedLineageMap {
  const base = emptySeedLineage();
  if (!raw || typeof raw !== "object") return base;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      base[id] = clampGeneration(value);
    }
  }
  return base;
}

export function lineageAfterCredit(
  lineage: SeedLineageMap,
  itemId: string,
  haveQty: number,
  addQty: number,
  addGeneration: number,
): SeedLineageMap {
  if (addQty <= 1e-9) return lineage;
  const have = Math.max(0, haveQty);
  const haveGen = lineage[itemId] ?? 0;
  if (have <= 1e-9) {
    return { ...lineage, [itemId]: clampGeneration(addGeneration) };
  }
  return { ...lineage, [itemId]: mixGeneration(have, haveGen, addQty, addGeneration) };
}

export function lineageAfterDeplete(lineage: SeedLineageMap, itemId: string, remainQty: number): SeedLineageMap {
  if (remainQty > 1e-9) return lineage;
  if ((lineage[itemId] ?? 0) === 0) return lineage;
  return { ...lineage, [itemId]: 0 };
}

export function seedGenerationLabel(generation: number): string {
  const g = clampGeneration(generation);
  const pct = Math.round((generationBonusFactor(g) - 1) * 100);
  if (g <= 0) return "第 0 代（商行種）";
  return `第 ${g} 代（產出 +${pct}%）`;
}
