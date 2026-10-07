import { describe, expect, it } from "vitest";
import {
  DEFAULT_RETAIL_CONFIG,
  RETAIL_SKU_ID,
  isRetailOfferExpired,
  resolveRetailBidAnchor,
  retailConfigFromDb,
  rollBidGold,
} from "./retail-config";
import { DEFAULT_MARKET_PRICES } from "./market-config";

describe("retail-config", () => {
  it("預設槽位與錨點對齊 RT-D12", () => {
    expect(DEFAULT_RETAIL_CONFIG.slotCount).toBe(3);
    expect(DEFAULT_RETAIL_CONFIG.bidAnchorGold).toBe(8);
    expect(DEFAULT_RETAIL_CONFIG.bidVarianceRatio).toBe(0.2);
    expect(RETAIL_SKU_ID).toBe("item_bread");
  });

  it("retailConfigFromDb 限制 slot 1–3", () => {
    const cfg = retailConfigFromDb({ slotCount: 99, bidVarianceRatio: 2 });
    expect(cfg.slotCount).toBe(3);
    expect(cfg.bidVarianceRatio).toBe(0.2);
  });

  it("resolveRetailBidAnchor 優先價目表", () => {
    const book = { sell: { item_bread: 10 }, buy: {} };
    expect(resolveRetailBidAnchor(book, DEFAULT_RETAIL_CONFIG)).toBe(10);
    expect(resolveRetailBidAnchor(DEFAULT_MARKET_PRICES, DEFAULT_RETAIL_CONFIG)).toBe(8);
  });

  it("rollBidGold 在錨點 ±20% 內", () => {
    const bids = new Set<number>();
    for (let i = 0; i < 50; i++) {
      bids.add(rollBidGold(8, 0.2, () => i / 50));
    }
    for (const b of bids) {
      expect(b).toBeGreaterThanOrEqual(6);
      expect(b).toBeLessThanOrEqual(10);
    }
  });

  it("isRetailOfferExpired", () => {
    expect(isRetailOfferExpired(undefined, 1000)).toBe(false);
    expect(isRetailOfferExpired(500, 1000)).toBe(true);
    expect(isRetailOfferExpired(1500, 1000)).toBe(false);
  });
});
