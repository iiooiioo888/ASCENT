import { describe, expect, it } from "vitest";
import { BRAND_DISPLAY_NAME, itemPurposeHint, methodPurposeHint } from "./productCopy";

describe("productCopy", () => {
  it("exposes feed and bread purpose hints for U13", () => {
    expect(methodPurposeHint("method_mix_feed_default")).toMatch(/下游/);
    expect(itemPurposeHint("item_bread")).toMatch(/麵包/);
  });

  it("brand constant is non-empty for HUD / loading", () => {
    expect(BRAND_DISPLAY_NAME.length).toBeGreaterThan(0);
  });
});
