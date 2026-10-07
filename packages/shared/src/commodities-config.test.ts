import { describe, expect, it } from "vitest";
import {
  COMMODITIES_CONFIG,
  appendPriceHistory,
  computeCommodityFee,
  computeCommodityUnitPrice,
  isCommoditySellBlockedByFee,
  enabledCommodityListings,
  findCommodityListing,
} from "./commodities-config";
import { DEFAULT_MARKET_PRICES } from "./market-config";

describe("commodities-config", () => {
  it("今輪僅 oil enabled", () => {
    expect(enabledCommodityListings().map((l) => l.id)).toEqual(["oil"]);
    expect(findCommodityListing("grain")?.enabled).toBe(false);
  });

  it("壓力價帶與基準", () => {
    expect(computeCommodityUnitPrice(15, 0)).toBe(15);
    expect(computeCommodityUnitPrice(15, 10)).toBe(17);
    expect(computeCommodityUnitPrice(15, -100)).toBe(8);
    expect(computeCommodityUnitPrice(15, 100)).toBe(23);
  });

  it("手續費 1% 至少 1 金", () => {
    expect(computeCommodityFee(15)).toBe(1);
    expect(computeCommodityFee(200)).toBe(2);
  });

  it("賣出成交額不高於手續費時拒絕", () => {
    expect(isCommoditySellBlockedByFee(1)).toBe(true);
    expect(isCommoditySellBlockedByFee(8)).toBe(false);
  });

  it("priceHistory ring 64", () => {
    let hist: { t: number; price: number }[] = [];
    for (let i = 0; i < 70; i++) {
      hist = appendPriceHistory(hist, i, 64, i);
    }
    expect(hist).toHaveLength(64);
    expect(hist[0].price).toBe(6);
    expect(hist[63].price).toBe(69);
  });

  it("MK 固定價目不含石油", () => {
    expect(DEFAULT_MARKET_PRICES.sell.item_oil).toBeUndefined();
    expect(DEFAULT_MARKET_PRICES.buy.item_oil).toBeUndefined();
    expect(COMMODITIES_CONFIG.listings.find((l) => l.id === "oil")?.itemId).toBe("item_oil");
  });
});
