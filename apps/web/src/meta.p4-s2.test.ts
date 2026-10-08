import { describe, expect, it } from "vitest";
import { BUILDING_ICON, ITEM_META, itemLabel } from "./meta";

describe("P4-S2 food factory meta", () => {
  it("exposes food factory building icon and Chinese name via API def", () => {
    expect(BUILDING_ICON.bdef_food_factory).toBe("🧁");
  });

  it("exposes cake display meta for inventory and market", () => {
    expect(ITEM_META.item_cake).toEqual({ name: "蛋糕", icon: "🍰" });
    expect(itemLabel("item_cake")).toBe("蛋糕");
    expect(itemLabel("item_egg")).toBe("雞蛋");
  });
});
