import { describe, expect, it } from "vitest";
import {
  buildingDefs,
  generateMethods,
  items,
  rules,
  seedPlacedBuildingDefIds,
  validateCatalog,
} from "@ascent/shared";
import { isMethodAllowedForBuilding } from "../inventory/building-method-access";

describe("資源循環 catalog（API 層對齊）", () => {
  it("種子預放建築含水井", () => {
    expect(seedPlacedBuildingDefIds).toContain("bdef_well");
    expect(buildingDefs.some((b) => b.id === "bdef_well" && b.code === "well")).toBe(true);
  });

  it("建築規則綁定：水井僅汲水、田可留種", () => {
    const well = buildingDefs.find((b) => b.id === "bdef_well")!;
    const field = buildingDefs.find((b) => b.id === "bdef_field")!;
    expect(isMethodAllowedForBuilding(well.allowed_rule_ids, "rule_draw_water")).toBe(true);
    expect(isMethodAllowedForBuilding(well.allowed_rule_ids, "rule_save_seed")).toBe(false);
    expect(isMethodAllowedForBuilding(field.allowed_rule_ids, "rule_save_seed")).toBe(true);
    expect(isMethodAllowedForBuilding(field.allowed_rule_ids, "rule_grow_wheat")).toBe(true);
  });

  it("validateCatalog 與 POST /validate 同源快照為綠", () => {
    const methods = generateMethods(rules);
    const errors = validateCatalog({ items, rules, methods });
    expect(errors).toEqual([]);
    expect(methods.filter((m) => m.rule_id === "rule_draw_water")).toHaveLength(1);
    expect(methods.filter((m) => m.rule_id === "rule_save_seed")).toHaveLength(1);
  });
});
