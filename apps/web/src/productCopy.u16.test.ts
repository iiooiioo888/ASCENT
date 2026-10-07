import { describe, expect, it } from "vitest";
import { BRAND_DISPLAY_NAME, DOCUMENT_TITLE, GAME_TIME_CHIP_PREFIX, timeScaleHudChip } from "./productCopy";

describe("productCopy P3-1 time chips", () => {
  it("DOCUMENT_TITLE follows BRAND_DISPLAY_NAME", () => {
    expect(DOCUMENT_TITLE).toBe(`${BRAND_DISPLAY_NAME} · 農莊`);
  });

  it("explains 1:60 scale in plain language", () => {
    expect(timeScaleHudChip(60)).toBe("⚖ 1 現實秒＝1 遊戲分");
    expect(GAME_TIME_CHIP_PREFIX).toBe("遊戲時");
  });
});
