import { describe, expect, it } from "vitest";
import {
  autoMethodSelectValue,
  buildingAutoMethodPendingKey,
  buildingAutoPendingKey,
  parseAutoMethodSelectValue,
  showBuildingAutoMethodSelect,
  showBuildingAutoToggle,
} from "./building-auto";

describe("building-auto", () => {
  it("shows toggle for production buildings with default auto method", () => {
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_field" })).toBe(true);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_well" })).toBe(true);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_mill" })).toBe(true);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_oven" })).toBe(true);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_ranch" })).toBe(true);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_food_factory" })).toBe(true);
  });

  it("hides toggle for trading post and silo", () => {
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_trading_post" })).toBe(false);
    expect(showBuildingAutoToggle({ buildingDefId: "bdef_silo" })).toBe(false);
  });

  it("uses distinct pending keys from building id", () => {
    expect(buildingAutoPendingKey("pb_field")).toBe("auto:pb_field");
    expect(buildingAutoMethodPendingKey("pb_mill")).toBe("auto-method:pb_mill");
  });

  it("maps autoMethodId null to empty select value and back", () => {
    expect(autoMethodSelectValue(null)).toBe("");
    expect(autoMethodSelectValue(undefined)).toBe("");
    expect(autoMethodSelectValue("method_mix_feed_default")).toBe("method_mix_feed_default");
    expect(parseAutoMethodSelectValue("")).toBeNull();
    expect(parseAutoMethodSelectValue("method_mix_feed_default")).toBe("method_mix_feed_default");
  });

  it("shows auto method select when building has production options", () => {
    expect(showBuildingAutoMethodSelect({ buildingDefId: "bdef_mill" }, 2)).toBe(true);
    expect(showBuildingAutoMethodSelect({ buildingDefId: "bdef_trading_post" }, 2)).toBe(false);
    expect(showBuildingAutoMethodSelect({ buildingDefId: "bdef_mill" }, 0)).toBe(false);
  });
});
