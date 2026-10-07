import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPS_DEPTH,
  haulGoldForBuilding,
  opsCostsFromDepth,
  opsDepthFromDb,
  wageGoldForBuilding,
} from "./ops-depth-config";

describe("ops-depth-config", () => {
  it("缺省為 LOCKED 常數", () => {
    const depth = opsDepthFromDb(null);
    expect(depth.workforce.startingHired).toBe(1);
    expect(depth.workforce.maxHired).toBe(4);
    expect(depth.workforce.hireCostGold).toBe(8);
    expect(depth.workforce.laborCostPerStart).toBe(1);
    expect(wageGoldForBuilding("bdef_field", depth)).toBe(1);
    expect(wageGoldForBuilding("bdef_mill", depth)).toBe(2);
    expect(haulGoldForBuilding("bdef_mill", depth)).toBe(1);
    expect(haulGoldForBuilding("bdef_field", depth)).toBe(0);
    expect(depth.sellTransport.item_bread).toBe(1);
  });

  it("非法負數忽略", () => {
    const depth = opsDepthFromDb({
      workforce: { hireCostGold: -1 },
      wages: { byBuildingId: { bdef_field: -5 } },
      sellTransport: { item_bread: -2 },
    });
    expect(depth.workforce.hireCostGold).toBe(DEFAULT_OPS_DEPTH.workforce.hireCostGold);
    expect(depth.wages.byBuildingId.bdef_field).toBe(1);
    expect(depth.sellTransport.item_bread).toBe(1);
  });

  it("opsCosts 快照含 haul／sellTransport 供預覽", () => {
    const costs = opsCostsFromDepth();
    expect(costs.hireCostGold).toBe(8);
    expect(costs.laborCostPerStart).toBe(1);
    expect(costs.wageByBuilding.bdef_oven).toBe(2);
    expect(costs.haulByBuilding.bdef_oven).toBe(2);
    expect(costs.sellTransport.item_bread).toBe(1);
  });
});
