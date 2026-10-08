import { describe, expect, it } from "vitest";
import {
  BRAND_DISPLAY_NAME,
  CONNECTION_INTERRUPTED_BANNER,
  DEPLETION_CTA_MARKET,
  DEPLETION_CTA_SAVE_SEED,
  DEPLETION_CTA_WELL,
  DEPLETION_EMPTY_BODY,
  DEPLETION_EMPTY_TITLE,
  FEATURE_OFFLINE_SUMMARY,
  FEATURE_SHOW_DEPLETION_EMPTY_STATE,
  isUnseededWorldClockError,
  itemPurposeHint,
  methodSelectAriaLabel,
  methodPurposeHint,
  OFFLINE_SUMMARY_FOOTNOTE,
  OFFLINE_SUMMARY_PENDING_TAG,
  parseViteBooleanEnv,
} from "./productCopy";

describe("productCopy", () => {
  it("exposes feed and bread purpose hints for U13 (written Traditional Chinese)", () => {
    expect(methodPurposeHint("method_mix_feed_default")).toBe("飼料可送牧場養雞牛，或送化工廠與鹼製成肥料。");
    expect(methodPurposeHint("method_raise_livestock_default")).toBe("消耗飼料與水，產出雞蛋與牛奶。");
    expect(itemPurposeHint("item_feed")).toBe("可送牧場養雞牛，或與鹼在化工廠製成肥料。");
    expect(itemPurposeHint("item_bread")).toMatch(/麵包/);
    expect(itemPurposeHint("item_bread")).not.toMatch(/係|冇/);
  });

  it("brand constant is the official game name for HUD / loading", () => {
    expect(BRAND_DISPLAY_NAME).toBe("帝國掘起");
  });

  it("U10 connection copy and seed hint detection", () => {
    expect(CONNECTION_INTERRUPTED_BANNER).toContain("連線中斷");
    expect(isUnseededWorldClockError("尚未種子世界時鐘")).toBe(true);
    expect(isUnseededWorldClockError("無法連接")).toBe(false);
  });

  it("U15 method select aria label helper", () => {
    expect(methodSelectAriaLabel("田")).toBe("選擇田的生產方式");
  });

  it("U11 offline summary flag and pending copy", () => {
    expect(FEATURE_OFFLINE_SUMMARY).toBe("A");
    expect(OFFLINE_SUMMARY_PENDING_TAG).toBe("待確認");
    expect(OFFLINE_SUMMARY_FOOTNOTE).toMatch(/8 現實小時/);
    expect(OFFLINE_SUMMARY_FOOTNOTE).toMatch(/只做一單/);
  });

  it("parseViteBooleanEnv is case-insensitive (FALSE disables)", () => {
    expect(parseViteBooleanEnv("FALSE", true)).toBe(false);
    expect(parseViteBooleanEnv("TRUE", false)).toBe(true);
  });

  it("parseViteBooleanEnv full semantics (trim, case, unknown → default)", () => {
    const cases: [string | undefined, boolean, boolean][] = [
      [undefined, true, true],
      [undefined, false, false],
      ["", true, true],
      ["   ", false, false],
      ["false", true, false],
      ["FALSE", true, false],
      ["0", true, false],
      ["no", true, false],
      ["off", true, false],
      ["true", false, true],
      ["TRUE", false, true],
      ["1", false, true],
      ["yes", false, true],
      ["on", false, true],
      ["  true  ", false, true],
      ["maybe", true, true],
      ["maybe", false, false],
      ["garbage", true, true],
      ["garbage", false, false],
    ];
    for (const [raw, defaultValue, expected] of cases) {
      expect(parseViteBooleanEnv(raw, defaultValue)).toBe(expected);
    }
  });

  it("FEATURE_SHOW_DEPLETION_EMPTY_STATE defaults on in test env", () => {
    expect(FEATURE_SHOW_DEPLETION_EMPTY_STATE).toBe(true);
  });

  it("exposes resource-loop depletion banner placeholders (§5.2)", () => {
    expect(DEPLETION_EMPTY_TITLE).toBe("生產已暫停：種子或水不足");
    expect(DEPLETION_EMPTY_BODY).toBe("用水井汲水，或用小麥留種後即可繼續。");
    expect(DEPLETION_CTA_WELL).toBe("用水井汲水");
    expect(DEPLETION_CTA_SAVE_SEED).toBe("用小麥留種");
    expect(DEPLETION_CTA_MARKET).toBe("前往商行");
  });
});
