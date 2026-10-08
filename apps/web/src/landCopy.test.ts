import { describe, expect, it } from "vitest";
import { landSlotStatusLabel } from "./landCopy";
import { landPurchaseStatsFromState } from "./land-purchase";
import type { GameState } from "./types";

describe("landSlotStatusLabel (P4-S1 cap)", () => {
  it("formats slotted count from API buildingSlotCap without hardcoding", () => {
    expect(landSlotStatusLabel(5, 12)).toBe("5／12");
    expect(landSlotStatusLabel(12, 12)).toBe("12／12");
  });

  it("landPurchaseStatsFromState forwards buildingSlotCap from state", () => {
    const state = {
      buildingCount: 5,
      buildingSlotCap: 12,
      fieldCount: 1,
      fieldCap: 2,
      buildings: [],
    } as Pick<GameState, "buildingCount" | "buildingSlotCap" | "fieldCount" | "fieldCap" | "buildings"> as GameState;
    expect(landPurchaseStatsFromState(state).buildingSlotCap).toBe(12);
  });
});
