import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPS_DEPTH,
  haulGoldForBuilding,
  opsCostsFromDepth,
  opsDepthFromDb,
  resolveSellGoldAfterTransport,
  wageGoldForBuilding,
} from "./ops-depth-config";

describe("ops-depth-config", () => {
  it("缺省為 LOCKED 常數", () => {
    const depth = opsDepthFromDb(null);
    expect(depth.workforce.startingHired).toBe(1);
    expect(depth.workforce.maxHired).toBe(8);
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

  it("賣出淨額：單價 8 運費 1 → net 7；運費過高拒絕", () => {
    expect(resolveSellGoldAfterTransport("item_bread", 8, 1)).toEqual({
      gross: 8,
      transportFee: 1,
      netGold: 7,
    });
    expect(resolveSellGoldAfterTransport("item_bread", 0, 1)).toBeNull();
  });

  it("opsCosts 快照含 haul／sellTransport 供預覽", () => {
    const costs = opsCostsFromDepth();
    expect(costs.hireCostGold).toBe(8);
    expect(costs.laborCostPerStart).toBe(1);
    expect(costs.wageByBuilding.bdef_oven).toBe(2);
    expect(costs.haulByBuilding.bdef_oven).toBe(2);
    expect(costs.sellTransport.item_bread).toBe(1);
    expect(costs.wageByBuilding.bdef_food_factory).toBe(3);
    expect(costs.haulByBuilding.bdef_food_factory).toBe(2);
    expect(costs.sellTransport.item_cake).toBe(1);
    expect(costs.wageByBuilding.bdef_textile_mill).toBe(2);
    expect(costs.haulByBuilding.bdef_textile_mill).toBe(1);
    expect(costs.sellTransport.item_cloth).toBe(1);
    expect(costs.wageByBuilding.bdef_mine).toBe(2);
    expect(costs.haulByBuilding.bdef_mine).toBe(0);
    expect(costs.wageByBuilding.bdef_smelter).toBe(3);
    expect(costs.haulByBuilding.bdef_smelter).toBe(2);
    expect(costs.sellTransport.item_iron).toBe(1);
  });
});
