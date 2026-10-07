import { describe, expect, it } from "vitest";
import { recipeConsumeLine, recipeProduceLine } from "./recipe-display";
import type { Method } from "./types";

const drawWater: Method = {
  id: "method_draw_water_default",
  code: "draw_water",
  ruleId: "rule_draw_water",
  durationGameSec: 600,
  inputs: [],
  outputs: [{ item_id: "item_water", qty: 5 }],
};

describe("recipe-display", () => {
  it("uses placeholder copy for draw water and save seed", () => {
    expect(recipeConsumeLine(drawWater)).toBe("—");
    expect(recipeProduceLine(drawWater)).toBe("💧水×5");
  });
});
