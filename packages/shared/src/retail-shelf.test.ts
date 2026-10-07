import { describe, expect, it } from "vitest";
import { DEFAULT_RETAIL_CONFIG } from "./retail-config";
import {
  defaultShelfAskGold,
  followMarketShelfAskGold,
  formatRetailShelfSoldMessage,
  gameDayIndex,
  resolveShelfAskGold,
  rollShelfSaleQty,
  shelfTicksElapsed,
} from "./retail-shelf";

describe("retail-shelf", () => {
  it("預設 ask 錨 MK 麵包賣價", () => {
    expect(defaultShelfAskGold({ sell: { item_bread: 8 }, buy: {} }, DEFAULT_RETAIL_CONFIG)).toBe(8);
    expect(defaultShelfAskGold({ sell: { item_bread: 8.9 }, buy: {} }, DEFAULT_RETAIL_CONFIG)).toBe(8);
  });

  it("跟市 ask = floor(MK×0.95)", () => {
    expect(followMarketShelfAskGold({ sell: { item_bread: 8 }, buy: {} }, DEFAULT_RETAIL_CONFIG)).toBe(7);
    expect(followMarketShelfAskGold({ sell: { item_bread: 20 }, buy: {} }, DEFAULT_RETAIL_CONFIG)).toBe(19);
  });

  it("resolveShelfAskGold 尊重 followMarket 與手動價", () => {
    const book = { sell: { item_bread: 8 }, buy: {} };
    expect(resolveShelfAskGold(null, true, book, DEFAULT_RETAIL_CONFIG)).toBe(7);
    expect(resolveShelfAskGold(12, false, book, DEFAULT_RETAIL_CONFIG)).toBe(12);
    expect(resolveShelfAskGold(12, true, book, DEFAULT_RETAIL_CONFIG)).toBe(7);
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
