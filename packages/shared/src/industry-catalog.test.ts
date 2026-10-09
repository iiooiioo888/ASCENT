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
    expect(generateMethods(rules).length).toBeLessThanOrEqual(13);
  });

  it("可玩目錄通過驗證，且飼料有肥料下游", () => {
    const methods = generateMethods(playableRules);
    expect(validateCatalog({ items: playableItems, rules: playableRules, methods })).toEqual([]);
    const fertilizer = playableRules.find((r) => r.id === "rule_mix_fertilizer");
    expect(fertilizer?.inputs.map((i) => i.item_id)).toEqual(["item_feed", "item_alkali"]);
    expect(fertilizer?.outputs[0]?.item_id).toBe("item_fertilizer");
    expect(playableItems.filter((i) => i.layer === "T" && i.derived_tier >= 2)).toEqual([]);
  });

  it("CURR-RES：採礦耗水、銀金礦錠與冶煉配方", () => {
    const mine = industryRules.find((r) => r.id === "rule_mine_copper")!;
    expect(mine.inputs).toEqual([{ item_id: "item_water", qty: 1 }]);
    expect(mine.outputs).toEqual([{ item_id: "item_copper_ore", qty: 2 }]);
    expect(industryRules.find((r) => r.id === "rule_mine_silver")?.outputs[0]).toEqual({
      item_id: "item_silver_ore",
      qty: 2,
    });
    expect(industryRules.find((r) => r.id === "rule_mine_gold")?.outputs[0]).toEqual({
      item_id: "item_gold_ore",
      qty: 1,
    });
    const smeltGold = industryRules.find((r) => r.id === "rule_smelt_gold")!;
    expect(smeltGold.outputs[0]?.item_id).toBe("item_gold_ingot");
    expect(smeltGold.outputs.some((o) => o.item_id === "item_gold")).toBe(false);
    expect(playableItems.some((i) => i.id === "item_gold_ingot")).toBe(true);
    const mineBuilding = industryBuildingDefs.find((b) => b.id === "bdef_mine")!;
    expect(mineBuilding.allowed_rule_ids).toEqual(
      expect.arrayContaining(["rule_mine_silver", "rule_mine_gold"]),
    );
    const smelter = industryBuildingDefs.find((b) => b.id === "bdef_smelter")!;
    expect(smelter.allowed_rule_ids).toEqual(
      expect.arrayContaining(["rule_smelt_silver", "rule_smelt_gold"]),
    );
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
