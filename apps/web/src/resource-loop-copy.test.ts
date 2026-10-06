import { describe, expect, it } from "vitest";
import { METHOD_NAME } from "./meta";
import {
  DEPLETION_BANNER,
  LOW_STOCK_THRESHOLD,
  METHOD_DRAW_WATER_ID,
  METHOD_RECIPE_DISPLAY,
  METHOD_SAVE_SEED_ID,
  RESOURCE_LOOP_GOAL_HINT,
  WELL_IDLE_JOBLINE,
} from "./resource-loop-copy";

describe("resource loop copy constants", () => {
  it("exposes goal banner hint", () => {
    expect(RESOURCE_LOOP_GOAL_HINT).toBe("缺水用井；缺種留種。");
  });

  it("uses low stock threshold placeholder", () => {
    expect(LOW_STOCK_THRESHOLD).toBe(5);
  });

  it("maps well and save-seed method display names", () => {
    expect(METHOD_NAME[METHOD_DRAW_WATER_ID]).toBe("汲水");
    expect(METHOD_NAME[METHOD_SAVE_SEED_ID]).toBe("留種");
  });

  it("defines recipe display placeholders", () => {
    expect(METHOD_RECIPE_DISPLAY[METHOD_DRAW_WATER_ID]).toEqual({
      consume: "—",
      produce: "💧水×5",
    });
    expect(METHOD_RECIPE_DISPLAY[METHOD_SAVE_SEED_ID]).toEqual({
      consume: "🌾小麥×2",
      produce: "🌱種子×1",
    });
  });

  it("defines depletion CTA copy", () => {
    expect(DEPLETION_BANNER.ctaWell).toBe("前往水井");
    expect(DEPLETION_BANNER.ctaSeed).toBe("查看留種");
  });

  it("defines well idle jobline", () => {
    expect(WELL_IDLE_JOBLINE).toBe("等待汲水");
  });
});
