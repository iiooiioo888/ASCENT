import { describe, expect, it } from "vitest";
import {
  fmtHudGameClockCompact,
  hudRecentActivityLabel,
  HUD_PRIMARY_CHIP_LIMIT,
  workforceHudSummaryLabel,
} from "./hud-display";

describe("hud-display FE-RICH-4", () => {
  it("工位摘要含聘／忙／上限", () => {
    expect(workforceHudSummaryLabel({ hired: 2, busy: 1, free: 1, maxHired: 4 })).toBe("👷 2/4·忙1");
  });

  it("精簡時鐘文案", () => {
    expect(fmtHudGameClockCompact(90061)).toMatch(/^⏱ 1日/);
  });

  it("最近動態截斷", () => {
    const long = "已售出 麵包×1，實收 🟠7（運費 🟠1）";
    expect(hudRecentActivityLabel(long, 12)).toBe("📣 已售出 麵包×1，實收…");
  });

  it("主要 chip 上限為 5", () => {
    expect(HUD_PRIMARY_CHIP_LIMIT).toBe(5);
  });
});
