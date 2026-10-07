import { describe, expect, it } from "vitest";
import {
  commodityBuyTotal,
  commodityFee,
  commoditySellFeeTooHigh,
  commoditySellNet,
  maxCommodityBuyQty,
} from "./commodities";

describe("commodity fee preview", () => {
  const feeRate = 0.01;
  const minFeeGold = 1;

  it("charges at least min fee", () => {
    expect(commodityFee(5, feeRate, minFeeGold)).toBe(1);
  });

  it("computes buy total with fee", () => {
    expect(commodityBuyTotal(15, 1, feeRate, minFeeGold)).toBe(16);
  });

  it("computes sell net after fee", () => {
    expect(commoditySellNet(15, 2, feeRate, minFeeGold)).toBe(29);
  });

  it("flags sell when fee eats notional", () => {
    expect(commoditySellFeeTooHigh(1, 1, feeRate, minFeeGold)).toBe(true);
    expect(commoditySellFeeTooHigh(15, 1, feeRate, minFeeGold)).toBe(false);
  });

  it("caps affordable buy qty by gold and order limit", () => {
    expect(maxCommodityBuyQty(15, 10, 20, feeRate, minFeeGold)).toBe(0);
    expect(maxCommodityBuyQty(15, 16, 20, feeRate, minFeeGold)).toBe(1);
    expect(maxCommodityBuyQty(15, 1000, 20, feeRate, minFeeGold)).toBe(20);
  });
});
