import { describe, expect, it } from "vitest";
import { buyBreadBeatsMarketSellForOrder, buySeedCheaperThanSave } from "./market-config";
import { diagnoseEconomyBottleneck } from "./economy-bottleneck";
import { resolveSessionDecision, resolveTutorialCoach } from "./play-loop-config";

describe("教學與上線決策", () => {
  it("開局教種麥", () => {
    const coach = resolveTutorialCoach({
      displayGameTime: 60,
      lifetimeCollected: {},
      seedGeneration: 0,
      fieldCount: 1,
    });
    expect(coach.id).toBe("plant");
  });

  it("收過麥、還沒麵包時教磨坊或烤麵包", () => {
    const coach = resolveTutorialCoach({
      displayGameTime: 400 * 60,
      lifetimeCollected: { item_wheat: 2 },
      seedGeneration: 0,
      fieldCount: 1,
    });
    expect(["mill", "bread"]).toContain(coach.id);
  });

  it("有訂單時上線決策指向訂單板", () => {
    const d = resolveSessionDecision({
      pendingOrderCount: 2,
      storageFill: 0.2,
      seedGeneration: 1,
      fieldCount: 2,
      fieldCap: 2,
      readyBuildingCount: 0,
    });
    expect(d.kind).toBe("order");
  });
});

describe("瓶頸與商行節奏", () => {
  it("水少時卡水", () => {
    const b = diagnoseEconomyBottleneck({
      water: 0,
      seeds: 10,
      fieldCount: 1,
      fieldCap: 2,
      storageUsed: 2,
      storageCap: 12,
    });
    expect(b.kind).toBe("water");
  });

  it("買種現金優於留種；趕大單時買麵包仍划算", () => {
    expect(buySeedCheaperThanSave()).toBe(true);
    expect(buyBreadBeatsMarketSellForOrder(2.2)).toBe(true);
  });
});
