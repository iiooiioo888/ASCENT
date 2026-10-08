import { describe, expect, it } from "vitest";
import { generateMethods } from "./method-generator";
import {
  INDUSTRY_BUILDING_DEF_IDS,
  industryBuildingDefs,
  industryItems,
  industryRules,
} from "./industry-catalog";
import { playableItems, playableMethodNames, playableRules } from "./playable-catalog";
import { validateCatalog } from "./validator";
import { items, rules } from "./agriculture-catalog";

describe("產業擴充目錄", () => {
  it("不改寫農業切片的物品與規則條數", () => {
    expect(items.some((i) => i.id === "item_iron_ore")).toBe(false);
    expect(rules.some((r) => r.id === "rule_mine_iron")).toBe(false);
    expect(generateMethods(rules).length).toBeLessThanOrEqual(10);
  });

  it("可玩目錄通過驗證，且飼料有肥料下游", () => {
    const methods = generateMethods(playableRules);
    expect(validateCatalog({ items: playableItems, rules: playableRules, methods })).toEqual([]);
    const fertilizer = playableRules.find((r) => r.id === "rule_mix_fertilizer");
    expect(fertilizer?.inputs.map((i) => i.item_id)).toEqual(["item_feed", "item_alkali"]);
    expect(fertilizer?.outputs[0]?.item_id).toBe("item_fertilizer");
    expect(playableItems.filter((i) => i.layer === "T" && i.derived_tier >= 2)).toEqual([]);
  });

  it("五條產業都有建築，且方式名稱齊全", () => {
    const systems = new Set(industryBuildingDefs.map((b) => b.system_code));
    expect(systems).toEqual(new Set(["mining", "chemical", "industry", "energy", "timber"]));
    expect(INDUSTRY_BUILDING_DEF_IDS).toHaveLength(industryBuildingDefs.length);
    const methods = generateMethods(industryRules);
    for (const method of methods) {
      expect(playableMethodNames[method.id]).toBeTruthy();
    }
  });
});
