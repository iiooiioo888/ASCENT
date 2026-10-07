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
  it("returns true when stock exactly equals need (epsilon boundary)", () => {
    const stock = inventoryQtyMap([row("item_water", "1")]);
    expect(canAffordInputs(stock, [{ item_id: "item_water", qty: 1 }])).toBe(true);
  });

  it("returns false when any input is short", () => {
    const stock = inventoryQtyMap([row("item_water", "0.5")]);
    expect(
      canAffordInputs(stock, [{ item_id: "item_water", qty: 1 }]),
    ).toBe(false);
  });

  it("returns false when one of multiple inputs is short", () => {
    const stock = inventoryQtyMap([
      row("item_water", "10"),
      row("item_seed_wheat", "0"),
    ]);
    expect(
      canAffordInputs(stock, [
        { item_id: "item_water", qty: 1 },
        { item_id: "item_seed_wheat", qty: 1 },
      ]),
    ).toBe(false);
  });

  it("treats missing inventory row as zero stock", () => {
    const stock = inventoryQtyMap([]);
    expect(canAffordInputs(stock, [{ item_id: "item_water", qty: 1 }])).toBe(false);
  });

  it("returns false when stock quantity parsed from string is NaN", () => {
    const stock = inventoryQtyMap([row("item_water", "not-a-number")]);
    expect(canAffordInputs(stock, [{ item_id: "item_water", qty: 1 }])).toBe(false);
  });

  it("returns false when required input qty is not finite", () => {
    const stock = inventoryQtyMap([row("item_water", "10")]);
    expect(canAffordInputs(stock, [{ item_id: "item_water", qty: Number.NaN }])).toBe(false);
  });

  it("returns false when stock map holds NaN for an item", () => {
    const stock = new Map<string, number>([["item_water", Number.NaN]]);
    expect(canAffordInputs(stock, [{ item_id: "item_water", qty: 1 }])).toBe(false);
  });

  it("returns false when stock map holds Infinity", () => {
    const stock = new Map<string, number>([["item_water", Number.POSITIVE_INFINITY]]);
    expect(canAffordInputs(stock, [{ item_id: "item_water", qty: 1 }])).toBe(false);
  });

  it("returns false when required input qty is negative", () => {
    const stock = inventoryQtyMap([row("item_water", "10")]);
    expect(canAffordInputs(stock, [{ item_id: "item_water", qty: -1 }])).toBe(false);
  });

  it("returns false when stock quantity is negative", () => {
    const stock = new Map<string, number>([["item_water", -0.5]]);
    expect(canAffordInputs(stock, [{ item_id: "item_water", qty: 1 }])).toBe(false);
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

describe("inputAvailability", () => {
  it("marks row short when have is NaN from bad inventory string", () => {
    const rows = inputAvailability(inventoryQtyMap([row("item_water", "oops")]), [
      { item_id: "item_water", qty: 1 },
    ]);
    expect(rows[0]?.short).toBe(true);
  });

  it("marks row short when need qty is negative", () => {
    const rows = inputAvailability(inventoryQtyMap([row("item_water", "5")]), [
      { item_id: "item_water", qty: -1 },
    ]);
    expect(rows[0]?.short).toBe(true);
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
