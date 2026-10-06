import { describe, expect, it } from "vitest";
import {
  BRAND_DISPLAY_NAME,
  CONNECTION_INTERRUPTED_BANNER,
  FEATURE_SHOW_DEPLETION_EMPTY_STATE,
  isUnseededWorldClockError,
  itemPurposeHint,
  methodPurposeHint,
  parseViteBooleanEnv,
} from "./productCopy";

describe("productCopy", () => {
  it("exposes feed and bread purpose hints for U13 (written Traditional Chinese)", () => {
    expect(methodPurposeHint("method_mix_feed_default")).toBe("飼料：目前沒有下游用途，可先略過。");
    expect(itemPurposeHint("item_feed")).toBe("目前沒有下游用途。");
    expect(itemPurposeHint("item_bread")).toMatch(/麵包/);
    expect(itemPurposeHint("item_bread")).not.toMatch(/係|冇/);
  });

  it("brand constant is non-empty for HUD / loading", () => {
    expect(BRAND_DISPLAY_NAME.length).toBeGreaterThan(0);
  });

  it("U10 connection copy and seed hint detection", () => {
    expect(CONNECTION_INTERRUPTED_BANNER).toContain("連線中斷");
    expect(isUnseededWorldClockError("尚未種子世界時鐘")).toBe(true);
    expect(isUnseededWorldClockError("無法連接")).toBe(false);
  });

  it("parseViteBooleanEnv respects common false/true tokens", () => {
    expect(parseViteBooleanEnv(undefined, true)).toBe(true);
    expect(parseViteBooleanEnv("", true)).toBe(true);
    expect(parseViteBooleanEnv("false", true)).toBe(false);
    expect(parseViteBooleanEnv("off", true)).toBe(false);
    expect(parseViteBooleanEnv("true", false)).toBe(true);
  });

  it("parseViteBooleanEnv trims whitespace and accepts 1/yes; unknown falls back to default", () => {
    expect(parseViteBooleanEnv("   ", false)).toBe(false);
    expect(parseViteBooleanEnv("  true  ", false)).toBe(true);
    expect(parseViteBooleanEnv("1", false)).toBe(true);
    expect(parseViteBooleanEnv("yes", false)).toBe(true);
    expect(parseViteBooleanEnv("maybe", true)).toBe(true);
    expect(parseViteBooleanEnv("maybe", false)).toBe(false);
    expect(parseViteBooleanEnv("garbage", true)).toBe(true);
  });

  it("FEATURE_SHOW_DEPLETION_EMPTY_STATE defaults on in test env", () => {
    expect(FEATURE_SHOW_DEPLETION_EMPTY_STATE).toBe(true);
  });
});
