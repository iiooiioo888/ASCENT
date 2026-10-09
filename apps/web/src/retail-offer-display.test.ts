import { describe, expect, it } from "vitest";
import {
  formatRetailOfferRemaining,
  retailOfferRemainSec,
  retailSlotSummary,
} from "./retail-offer-display";

describe("retail-offer-display", () => {
  it("retailSlotSummary clamps filled count", () => {
    expect(retailSlotSummary(2, 3)).toBe("槽位 2／3");
    expect(retailSlotSummary(5, 3)).toBe("槽位 3／3");
    expect(retailSlotSummary(-1, 0)).toBe("槽位 0／1");
  });

  it("formatRetailOfferRemaining handles missing expiry", () => {
    expect(formatRetailOfferRemaining(undefined, 1000)).toBe("—");
  });

  it("formatRetailOfferRemaining counts down", () => {
    const now = 10_000;
    expect(formatRetailOfferRemaining(now + 45_000, now)).toBe("剩餘 45 秒");
    expect(formatRetailOfferRemaining(now + 90_000, now)).toBe("剩餘 1 分 30 秒");
    expect(formatRetailOfferRemaining(now - 1, now)).toBe("已過期");
  });

  it("retailOfferRemainSec returns null without expiresAt", () => {
    expect(retailOfferRemainSec(undefined, 0)).toBeNull();
  });
});
