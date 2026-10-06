import { describe, expect, it } from "vitest";
import { canStopBuilding } from "./building-actions";
import { isResourceDepleted } from "./depletion";
import { demoMillRunning } from "./prb-demo/fixtures";
import type { InvRow, Method } from "./types";

const row = (itemId: string, quantity: string): InvRow => ({
  itemId,
  quantity,
  item: { code: itemId, layer: "T", derivedTier: 0 },
});

const growWheat: Method = {
  id: "method_grow_wheat_default",
  code: "grow_wheat_default",
  ruleId: "rule_grow_wheat",
  durationGameSec: 3600,
  inputs: [
    { item_id: "item_seed_wheat", qty: 1 },
    { item_id: "item_water", qty: 1 },
  ],
  outputs: [
    { item_id: "item_wheat", qty: 2 },
    { item_id: "item_straw", qty: 1 },
  ],
};

const methodsByRule = new Map<string, Method[]>([["rule_grow_wheat", [growWheat]]]);

/**
 * QA: U6 depletion must not block U4 stop while a job is still running (#4 canStopBuilding).
 */
describe("depletion × canStopBuilding (PR #9 merge sanity)", () => {
  it("running job is not treated as depleted; stop stays allowed", () => {
    const depletedStock = [row("item_seed_wheat", "0"), row("item_water", "0")];
    const buildings = [demoMillRunning];

    expect(isResourceDepleted(buildings, depletedStock, methodsByRule)).toBe(false);
    expect(canStopBuilding(demoMillRunning.status)).toBe(true);
  });

  it("idle + depleted stock is depleted; stop remains disabled", () => {
    const depletedStock = [row("item_seed_wheat", "0"), row("item_water", "0")];
    const idleField = {
      ...demoMillRunning,
      id: "b_field",
      status: "idle" as const,
      methodId: null,
      queue: [],
      buildingDefId: "bdef_field",
      buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
    };

    expect(isResourceDepleted([idleField], depletedStock, methodsByRule)).toBe(true);
    expect(canStopBuilding(idleField.status)).toBe(false);
  });
});
