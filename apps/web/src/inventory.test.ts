import { describe, expect, it } from "vitest";
import { canAffordInputs, fmtInputHaveNeed, inputAvailability, inventoryQtyMap } from "./inventory";
import type { InvRow } from "./types";

const row = (itemId: string, quantity: string): InvRow => ({
  itemId,
  quantity,
  item: { code: itemId, layer: "T", derivedTier: 0 },
});

describe("inventoryQtyMap", () => {
  it("parses quantities as numbers", () => {
    const map = inventoryQtyMap([row("item_water", "0.5")]);
    expect(map.get("item_water")).toBe(0.5);
  });
});

describe("canAffordInputs", () => {
  it("returns false when any input is short", () => {
    const stock = inventoryQtyMap([row("item_water", "0.5")]);
    expect(
      canAffordInputs(stock, [{ item_id: "item_water", qty: 1 }]),
    ).toBe(false);
  });

  it("returns true when stock meets all inputs", () => {
    const stock = inventoryQtyMap([
      row("item_water", "1"),
      row("item_seed_wheat", "1"),
    ]);
    expect(
      canAffordInputs(stock, [
        { item_id: "item_water", qty: 1 },
        { item_id: "item_seed_wheat", qty: 1 },
      ]),
    ).toBe(true);
  });
});

describe("fmtInputHaveNeed", () => {
  it("formats fractional have/need for shortage display", () => {
    const [avail] = inputAvailability(inventoryQtyMap([row("item_water", "0.5")]), [
      { item_id: "item_water", qty: 1 },
    ]);
    expect(fmtInputHaveNeed(avail)).toBe("💧水 0.5／1");
  });
});
