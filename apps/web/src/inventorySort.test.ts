import { describe, expect, it } from "vitest";
import { INVENTORY_DISPLAY_ORDER, sortInventoryRows } from "./inventorySort";
import type { InvRow } from "./types";

const row = (itemId: string): InvRow => ({
  itemId,
  quantity: "1",
  item: { code: itemId, layer: "T", derivedTier: 0 },
});

describe("sortInventoryRows (P3-4)", () => {
  it("orders rows by agriculture DAG sequence", () => {
    const shuffled = [row("item_bread"), row("item_water"), row("item_seed_wheat")];
    const sorted = sortInventoryRows(shuffled).map((r) => r.itemId);
    expect(sorted).toEqual(["item_seed_wheat", "item_water", "item_bread"]);
  });

  it("exports stable catalog order length", () => {
    expect(INVENTORY_DISPLAY_ORDER.length).toBe(41);
    expect(INVENTORY_DISPLAY_ORDER).toContain("item_egg");
    expect(INVENTORY_DISPLAY_ORDER).toContain("item_milk");
  });
});
