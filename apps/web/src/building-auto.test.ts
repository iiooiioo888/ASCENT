import { describe, expect, it } from "vitest";
import { buildingAutoPendingKey, showBuildingAutoToggle } from "./building-auto";

describe("building-auto", () => {
  it("shows toggle for production buildings with default auto method", () => {
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_field" })).toBe(true);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_well" })).toBe(true);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_mill" })).toBe(true);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_oven" })).toBe(true);
  });

  it("hides toggle for trading post and silo", () => {
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_trading_post" })).toBe(false);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_silo" })).toBe(false);
  });

  it("uses distinct pending keys from building id", () => {
    expect(buildingAutoPendingKey("pb_field")).toBe("auto:pb_field");
  });
});
