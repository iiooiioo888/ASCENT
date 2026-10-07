import { describe, expect, it } from "vitest";
import { mergeRetailShelfFromState } from "./retail-shelf";

describe("mergeRetailShelfFromState", () => {
  it("merges state slice and keeps skuId", () => {
    const merged = mergeRetailShelfFromState(
      { enabled: false, followMarket: true, ask: 8, todayRevenueGold: 0, skuId: "item_bread" },
      { enabled: true, followMarket: false, ask: 12, todayRevenueGold: 5 },
    );
    expect(merged).toEqual({
      enabled: true,
      followMarket: false,
      ask: 12,
      todayRevenueGold: 5,
      skuId: "item_bread",
    });
  });
});
