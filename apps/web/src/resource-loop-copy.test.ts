import { describe, expect, it } from "vitest";
import { METHOD_NAME } from "./meta";
import {
  DEPLETION_BANNER,
  LOW_STOCK_THRESHOLD,
  METHOD_DRAW_WATER_ID,
  METHOD_RECIPE_DISPLAY,
  METHOD_SAVE_SEED_ID,
  RESOURCE_LOOP_GOAL_HINT,
  WELL_BUILDING_DEF_ID,
  WELL_IDLE_JOBLINE,
  isBuildingDefPlaceableInUi,
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

  it("defines depletion CTA copy (v1.1)", () => {
    expect(DEPLETION_BANNER.ctaWell).toBe("用水井汲水");
    expect(DEPLETION_BANNER.ctaSeed).toBe("用小麥留種");
  });

  it("never offers well placement in UI (seeded by BE)", () => {
    expect(isBuildingDefPlaceableInUi(WELL_BUILDING_DEF_ID)).toBe(false);
    expect(isBuildingDefPlaceableInUi("bdef_silo")).toBe(true);
  });

  it("filters unplaced defs without well placement cards", () => {
    const defs = [
      { id: WELL_BUILDING_DEF_ID, name: "水井" },
      { id: "bdef_silo", name: "倉" },
    ];
    const buildings: { buildingDefId: string }[] = [];
    const unplaced = defs.filter(
      (d) => isBuildingDefPlaceableInUi(d.id) && !buildings.some((b) => b.buildingDefId === d.id),
    );
    expect(unplaced.map((d) => d.name)).toEqual(["倉"]);
    expect(unplaced.some((d) => d.name === "水井")).toBe(false);
  });

  it("defines well idle jobline", () => {
    expect(WELL_IDLE_JOBLINE).toBe("等待汲水");
  });
});
