import { describe, expect, it } from "vitest";
import { LAND_COPY } from "./landCopy";
import { evaluateLandPurchaseUi, landPurchaseStatsFromState } from "./land-purchase";
import type { GameState } from "./types";

describe("evaluateLandPurchaseUi", () => {
  const baseStats = {
    fieldCount: 1,
    fieldCap: 2,
    slottedBuildingCount: 5,
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
    const ui = evaluateLandPurchaseUi({ ...baseStats, buildingSlotCap: 12, slottedBuildingCount: 12 }, 100);
    expect(ui.canBuy).toBe(false);
    expect(ui.blockReason).toBe(LAND_COPY.slotsFull);
  });

  it("landPurchaseStatsFromState 排除倉庫計槽", () => {
    const state = {
      buildings: [
        { id: "1", buildingDefId: "bdef_field", status: "idle", methodId: null, queue: [], bufferedOutputs: {}, buildingDef: { name: "田", allowedRuleIds: [] } },
        { id: "2", buildingDefId: "bdef_silo", status: "idle", methodId: null, queue: [], bufferedOutputs: {}, buildingDef: { name: "倉", allowedRuleIds: [] } },
        { id: "3", buildingDefId: "bdef_mill", status: "idle", methodId: null, queue: [], bufferedOutputs: {}, buildingDef: { name: "磨", allowedRuleIds: [] } },
      ],
    } as Pick<GameState, "buildings"> as GameState;
    const stats = landPurchaseStatsFromState(state);
    expect(stats.slottedBuildingCount).toBe(2);
  });
});
