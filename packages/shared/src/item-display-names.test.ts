import { describe, expect, it } from "vitest";
import { insufficientMaterialMessage, itemDisplayName } from "./item-display-names";

describe("item-display-names", () => {
  it("已知物品回傳中文名", () => {
    expect(itemDisplayName("item_egg")).toBe("雞蛋");
    expect(itemDisplayName("item_cake")).toBe("蛋糕");
    expect(itemDisplayName("item_cotton")).toBe("棉花");
  });

  it("資源不足文案", () => {
    expect(insufficientMaterialMessage("item_egg")).toBe("資源不足：雞蛋");
    expect(insufficientMaterialMessage("item_oil")).toBe("資源不足：石油");
  });
});
