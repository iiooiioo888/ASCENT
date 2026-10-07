import { describe, expect, it } from "vitest";
import { canStopBuilding, showProductionActionButtons } from "./building-actions";
import { demoSiloBuilding } from "./screenshot-harness/fixtures";

describe("canStopBuilding", () => {
  it("enables stop only while running", () => {
    expect(canStopBuilding("running")).toBe(true);
  });

  it("disables stop when idle or ready to collect", () => {
    expect(canStopBuilding("idle")).toBe(false);
    expect(canStopBuilding("ready")).toBe(false);
  });
});

describe("showProductionActionButtons (U12 legacy silo)", () => {
  it("hides actions for silo buildings", () => {
    expect(showProductionActionButtons(demoSiloBuilding)).toBe(false);
  });

  it("shows actions for production buildings", () => {
    expect(showProductionActionButtons({ buildingDefId: "bdef_field" })).toBe(true);
  });
});
