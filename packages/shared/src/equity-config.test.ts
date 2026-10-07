import { describe, expect, it } from "vitest";
import {
  EQUITY_CONFIG,
  appendPriceHistoryRing,
  clampEquityPrice,
  computeEquityFee,
  getEquityListing,
  isKnownEquityId,
} from "./equity-config";

describe("equity-config", () => {
  it("三檔 LOCKED 標的", () => {
    expect(EQUITY_CONFIG.listings).toHaveLength(3);
    expect(getEquityListing("eq_wheat_coop")?.basePrice).toBe(10);
    expect(isKnownEquityId("eq_unknown")).toBe(false);
  });

  it("clampEquityPrice 價帶 ±50%", () => {
    expect(clampEquityPrice(10, 0)).toBe(10);
    expect(clampEquityPrice(10, 1000)).toBe(15);
    expect(clampEquityPrice(10, -1000)).toBe(5);
  });

  it("computeEquityFee 2% 下限 1", () => {
    expect(computeEquityFee(10)).toBe(1);
    expect(computeEquityFee(100)).toBe(2);
  });

  it("appendPriceHistoryRing 保留最近 64 點", () => {
    let h: { t: number; price: number }[] = [];
    for (let i = 0; i < 70; i++) {
      h = appendPriceHistoryRing(h, { t: i, price: i }, 64);
    }
    expect(h).toHaveLength(64);
    expect(h[0].t).toBe(6);
    expect(h[63].t).toBe(69);
  });
});
