import { describe, expect, it } from "vitest";
import { DEFAULT_RETAIL_CONFIG } from "./retail-config";
import {
  defaultShelfAskGold,
  formatRetailShelfSoldMessage,
  gameDayIndex,
  rollShelfSaleQty,
  shelfTicksElapsed,
} from "./retail-shelf";

describe("retail-shelf", () => {
  it("預設 ask 錨 MK 麵包賣價", () => {
    expect(defaultShelfAskGold({ sell: { item_bread: 8 }, buy: {} }, DEFAULT_RETAIL_CONFIG)).toBe(8);
    expect(defaultShelfAskGold({ sell: { item_bread: 8.9 }, buy: {} }, DEFAULT_RETAIL_CONFIG)).toBe(8);
  });

  it("售出數量 1～min(3,庫存)", () => {
    const rnd = () => 0;
    expect(rollShelfSaleQty(10, rnd)).toBe(1);
    expect(rollShelfSaleQty(1, rnd)).toBe(1);
    expect(rollShelfSaleQty(0, rnd)).toBe(0);
    expect(rollShelfSaleQty(3, () => 0.99)).toBe(3);
  });

  it("tick 間隔累積", () => {
    expect(shelfTicksElapsed(0, 5000, 5000, 28800)).toBe(1);
    expect(shelfTicksElapsed(0, 12000, 5000, 28800)).toBe(2);
  });

  it("遊戲日索引", () => {
    expect(gameDayIndex(0, 86400)).toBe(0);
    expect(gameDayIndex(86400, 86400)).toBe(1);
  });

  it("售出文案", () => {
    expect(formatRetailShelfSoldMessage(2)).toBe("貨架已售出 ×2");
  });
});
