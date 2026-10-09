import { describe, expect, it } from "vitest";
import { STORAGE_STACK_CAP, countStorageStacks, wouldExceedStorageCap } from "./storage-config";

describe("倉儲 12 格", () => {
  it("貨幣不佔格，零數量不佔格", () => {
    expect(
      countStorageStacks([
        { itemId: "item_copper_ingot", quantity: 50000 },
        { itemId: "item_seed_wheat", quantity: 10 },
        { itemId: "item_water", quantity: 4 },
        { itemId: "item_wheat", quantity: 0 },
      ]),
    ).toBe(2);
  });

  it("新物品種類在滿倉時被擋", () => {
    const rows = Array.from({ length: STORAGE_STACK_CAP }, (_, i) => ({
      itemId: `item_${i}`,
      quantity: 1,
    }));
    expect(wouldExceedStorageCap(rows, { item_new: 1 })).toBe(true);
    expect(wouldExceedStorageCap(rows, { item_0: 3 })).toBe(false);
  });
});
