import { ITEM_GOLD_ID, ITEM_OIL_ID, playableBuildingDefs, playableItems } from "@ascent/shared";
import { describe, expect, it } from "vitest";
import { INDUSTRY_TABS, industryOfBuildingDef, industryOfItem, isIndustryId } from "./industries";

describe("industry tabs", () => {
  it("maps every playable building to exactly one tab", () => {
    const tabIds = new Set<string>(INDUSTRY_TABS.map((tab) => tab.id));
    for (const def of playableBuildingDefs) {
      expect(tabIds.has(def.system_code)).toBe(true);
      expect(industryOfBuildingDef(def.id)).toBe(def.system_code);
    }
  });

  it("keeps commerce buildings on the agriculture tab", () => {
    expect(industryOfBuildingDef("bdef_trading_post")).toBe("agriculture");
    expect(industryOfBuildingDef("bdef_well")).toBe("agriculture");
    expect(industryOfBuildingDef("bdef_mining_pit")).toBe("mining");
    expect(industryOfBuildingDef("bdef_forest")).toBe("timber");
    expect(industryOfBuildingDef("bdef_kiln")).toBe("chemical");
    expect(industryOfBuildingDef("bdef_workshop")).toBe("industry");
    expect(industryOfBuildingDef("bdef_boiler")).toBe("energy");
  });

  it("falls unknown defs back to agriculture so they stay reachable", () => {
    expect(isIndustryId("mining")).toBe(true);
    expect(industryOfBuildingDef("bdef_unknown")).toBe("agriculture");
  });

  it("puts each product on the industry that makes it", () => {
    expect(industryOfItem("item_wheat")).toBe("agriculture");
    expect(industryOfItem("item_iron_ore")).toBe("mining");
    expect(industryOfItem("item_coal")).toBe("mining");
    expect(industryOfItem("item_steel")).toBe("mining");
    expect(industryOfItem("item_log")).toBe("timber");
    expect(industryOfItem("item_fertilizer")).toBe("chemical");
    expect(industryOfItem("item_charcoal")).toBe("chemical");
    expect(industryOfItem("item_plank")).toBe("industry");
    expect(industryOfItem("item_engine")).toBe("industry");
    expect(industryOfItem("item_cake")).toBe("industry");
    expect(industryOfBuildingDef("bdef_food_factory")).toBe("industry");
    expect(industryOfItem("item_steam")).toBe("energy");
    expect(industryOfItem(ITEM_GOLD_ID)).toBeNull();
    expect(industryOfItem(ITEM_OIL_ID)).toBeNull();
    const unmapped = playableItems
      .map((item) => item.id)
      .filter((id) => id !== ITEM_GOLD_ID && id !== ITEM_OIL_ID && industryOfItem(id) == null);
    expect(unmapped).toEqual([]);
  });
});
