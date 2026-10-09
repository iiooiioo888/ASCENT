import { describe, expect, it } from "vitest";
import { inventoryBucketForItem, layoutInventoryRows } from "./inventory-display";
import type { InvRow } from "./types";

const row = (itemId: string, quantity = "1"): InvRow => ({
  itemId,
  quantity,
  item: { code: itemId, layer: "T", derivedTier: 0 },
});

describe("inventory-display", () => {
  it("maps copper ingot to ingot bucket", () => {
    expect(inventoryBucketForItem("item_copper_ingot")).toBe("ingot");
    expect(inventoryBucketForItem("item_wheat")).toBe("grain");
    expect(inventoryBucketForItem("item_bread")).toBe("finished");
  });

  it("pins ingot and grain ahead of grouped sections", () => {
    const layout = layoutInventoryRows([
      row("item_bread"),
      row("item_wheat"),
      row("item_flour"),
      row("item_copper_ingot"),
    ]);
    expect(layout.pinned.map((r) => r.itemId)).toEqual(["item_copper_ingot", "item_wheat"]);
    expect(layout.sections.map((s) => s.bucket)).toEqual(["intermediate", "finished"]);
  });
});
