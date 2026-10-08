import { describe, expect, it } from "vitest";
import { BUILDING_ICON, ITEM_META, itemLabel } from "./meta";

describe("meta (P4-S1 livestock)", () => {
  it("exposes ranch building icon and Chinese name via API def", () => {
    expect(BUILDING_ICON.bdef_ranch).toBe("🐄");
  });

  it("exposes egg and milk display meta for inventory and market", () => {
    expect(ITEM_META.item_egg).toEqual({ name: "雞蛋", icon: "🥚" });
    expect(ITEM_META.item_milk).toEqual({ name: "牛奶", icon: "🥛" });
    expect(itemLabel("item_egg")).toBe("雞蛋");
    expect(itemLabel("item_milk")).toBe("牛奶");
  });
});
