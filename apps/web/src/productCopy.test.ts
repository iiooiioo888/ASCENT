import { describe, expect, it } from "vitest";
import {
  BRAND_DISPLAY_NAME,
  CONNECTION_INTERRUPTED_BANNER,
  FEATURE_OFFLINE_SUMMARY,
  isUnseededWorldClockError,
  itemPurposeHint,
  methodPurposeHint,
  OFFLINE_SUMMARY_FOOTNOTE,
  OFFLINE_SUMMARY_PENDING_TAG,
} from "./productCopy";

describe("productCopy", () => {
  it("exposes feed and bread purpose hints for U13", () => {
    expect(methodPurposeHint("method_mix_feed_default")).toMatch(/下游/);
    expect(itemPurposeHint("item_bread")).toMatch(/麵包/);
  });

  it("brand constant is non-empty for HUD / loading", () => {
    expect(BRAND_DISPLAY_NAME.length).toBeGreaterThan(0);
  });

  it("U10 connection copy and seed hint detection", () => {
    expect(CONNECTION_INTERRUPTED_BANNER).toContain("連線中斷");
    expect(isUnseededWorldClockError("尚未種子世界時鐘")).toBe(true);
    expect(isUnseededWorldClockError("無法連接")).toBe(false);
  });

  it("U11 offline summary flag and pending copy", () => {
    expect(FEATURE_OFFLINE_SUMMARY).toBe("A");
    expect(OFFLINE_SUMMARY_PENDING_TAG).toBe("待確認");
    expect(OFFLINE_SUMMARY_FOOTNOTE).toMatch(/8 現實小時/);
    expect(OFFLINE_SUMMARY_FOOTNOTE).toMatch(/只做一單/);
  });
});
