import { describe, expect, it } from "vitest";
import {
  applyOptimisticCollect,
  applyOptimisticStart,
  applyOptimisticStop,
} from "./optimistic-building";
import type { GameState, Method } from "./types";

const method: Method = {
  id: "method_grow_wheat_default",
  code: "grow",
  ruleId: "rule_grow_wheat",
  durationGameSec: 3600,
  inputs: [
    { item_id: "item_seed_wheat", qty: 1 },
    { item_id: "item_water", qty: 1 },
  ],
  outputs: [{ item_id: "item_wheat", qty: 2 }],
};

function state(): GameState {
  return {
    time: { displayGameTime: 0, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [
      { itemId: "item_seed_wheat", quantity: "5", item: { code: "seed", layer: "T", derivedTier: 1 } },
      { itemId: "item_water", quantity: "5", item: { code: "water", layer: "T", derivedTier: 1 } },
      { itemId: "item_copper_ingot", quantity: "100", item: { code: "copper", layer: "C", derivedTier: 0 } },
    ],
    buildings: [
      {
        id: "pb_field",
        status: "idle",
        buildingDefId: "bdef_field",
        buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
        methodId: null,
        queue: [],
        bufferedOutputs: {},
      },
    ],
    methods: [method],
    buildingDefs: [{ id: "bdef_field", name: "田", code: "field", systemCode: "agriculture" }],
  };
}

describe("建築樂觀更新", () => {
  it("開工先扣料改 running，停止回 idle，收取入庫", () => {
    const started = applyOptimisticStart(state(), "pb_field", method, 10);
    expect(started.buildings[0].status).toBe("running");
    expect(started.inventory.find((r) => r.itemId === "item_seed_wheat")?.quantity).toBe("4");
    expect(started.inventory.find((r) => r.itemId === "item_copper_ingot")?.quantity).toBe("90");

    const stopped = applyOptimisticStop(started, "pb_field");
    expect(stopped.buildings[0].status).toBe("idle");

    const ready: GameState = {
      ...started,
      buildings: [{ ...started.buildings[0], status: "ready", bufferedOutputs: { item_wheat: 2 } }],
    };
    const collected = applyOptimisticCollect(ready, "pb_field");
    expect(collected.buildings[0].status).toBe("idle");
    expect(collected.inventory.find((r) => r.itemId === "item_wheat")?.quantity).toBe("2");
  });
});
