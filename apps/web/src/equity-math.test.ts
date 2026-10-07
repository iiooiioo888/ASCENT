import { describe, expect, it } from "vitest";
import {
  computeEquityFee,
  equityBuyTotalGold,
  equitySellNetGold,
  maxAffordableEquityQty,
} from "./equity-math";

describe("equity-math", () => {
  it("computes fee per EQ-D5", () => {
    expect(computeEquityFee(100)).toBe(2);
    expect(computeEquityFee(10)).toBe(1);
    expect(computeEquityFee(0)).toBe(1);
  });

  it("buy total includes fee", () => {
    expect(equityBuyTotalGold(10, 1, 0.02, 1)).toBe(11);
  });

  it("sell net deducts fee", () => {
    expect(equitySellNetGold(10, 1, 0.02, 1)).toBe(9);
  });

  it("max affordable respects gold and cap", () => {
    expect(maxAffordableEquityQty(11, 10, 0.02, 1, 10)).toBe(1);
    expect(maxAffordableEquityQty(5, 10, 0.02, 1, 10)).toBe(0);
  });
});
