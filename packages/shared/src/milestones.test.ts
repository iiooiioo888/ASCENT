import { describe, expect, it } from "vitest";
import {
  addLifetimeCollected,
  evaluateUnlockedIndustries,
  milestoneLockReason,
  playerProgressFromDb,
} from "./milestones";

describe("里程碑解鎖", () => {
  it("預設只有農業", () => {
    expect(evaluateUnlockedIndustries({})).toEqual(["agriculture"]);
    expect(milestoneLockReason("mining")).toContain("麵包");
  });

  it("收取夠麵包才開礦業", () => {
    const next = addLifetimeCollected(playerProgressFromDb(null), { item_bread: 4 });
    expect(next.unlockedIndustries).toContain("mining");
    expect(next.unlockedIndustries).not.toContain("timber");
  });

  it("已解鎖的產業不會被收回", () => {
    const progress = playerProgressFromDb({
      lifetimeCollected: {},
      unlockedIndustries: ["agriculture", "mining"],
    });
    expect(progress.unlockedIndustries).toContain("mining");
  });
});
