import { describe, expect, it } from "vitest";
import { isMethodAllowedForBuilding } from "./building-method-access";

describe("isMethodAllowedForBuilding", () => {
  it("allowed_rule_ids 為空時（倉庫）拒絕任何方式", () => {
    expect(isMethodAllowedForBuilding([], "rule_grow_wheat")).toBe(false);
    expect(isMethodAllowedForBuilding([], "rule_mill_flour")).toBe(false);
  });

  it("僅允許列內 rule 對應的方式", () => {
    const allowed = ["rule_grow_wheat"];
    expect(isMethodAllowedForBuilding(allowed, "rule_grow_wheat")).toBe(true);
    expect(isMethodAllowedForBuilding(allowed, "rule_mill_flour")).toBe(false);
  });

  it("null/undefined 視同空列表", () => {
    expect(isMethodAllowedForBuilding(null, "rule_grow_wheat")).toBe(false);
    expect(isMethodAllowedForBuilding(undefined, "rule_grow_wheat")).toBe(false);
  });
});
