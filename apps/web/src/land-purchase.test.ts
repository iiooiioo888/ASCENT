import { describe, expect, it } from "vitest";
import { LAND_COPY } from "./landCopy";
import { evaluateLandPurchaseUi } from "./land-purchase";

describe("evaluateLandPurchaseUi", () => {
  const baseStats = {
    fieldCount: 1,
    fieldCap: 2,
    buildingCount: 5,
    buildingSlotCap: 6,
  };

  it("allows purchase when gold meets price", () => {
    const ui = evaluateLandPurchaseUi(baseStats, 10);
    expect(ui.canBuy).toBe(true);
    expect(ui.priceGold).toBe(10);
    expect(ui.blockReason).toBeNull();
  });

  it("blocks when gold is insufficient", () => {
    const ui = evaluateLandPurchaseUi(baseStats, 9);
    expect(ui.canBuy).toBe(false);
    expect(ui.blockReason).toBe(LAND_COPY.needGold);
  });

  it("blocks when field cap reached", () => {
    const ui = evaluateLandPurchaseUi({ ...baseStats, fieldCount: 2 }, 100);
    expect(ui.canBuy).toBe(false);
    expect(ui.blockReason).toBe(LAND_COPY.fieldAtCap);
    expect(ui.priceGold).toBeNull();
  });

  it("blocks when building slots full", () => {
    const ui = evaluateLandPurchaseUi({ ...baseStats, buildingCount: 6 }, 100);
    expect(ui.canBuy).toBe(false);
    expect(ui.blockReason).toBe(LAND_COPY.slotsFull);
  });
});
