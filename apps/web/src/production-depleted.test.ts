import { describe, expect, it } from "vitest";
import { isProductionDepleted } from "./production-depleted";
import type { Building, GameState, InvRow, Method } from "./types";

const inv = (rows: { id: string; qty: string }[]): InvRow[] =>
  rows.map((r) => ({
    itemId: r.id,
    quantity: r.qty,
    item: { code: r.id, layer: "T", derivedTier: 0 },
  }));

const method = (partial: Partial<Method> & Pick<Method, "id" | "ruleId">): Method => ({
  code: partial.id,
  durationGameSec: 600,
  inputs: [],
  outputs: [],
  ...partial,
});

const building = (partial: Partial<Building> & Pick<Building, "id" | "buildingDefId">): Building => ({
  status: "idle",
  buildingDef: { name: "x", allowedRuleIds: partial.buildingDef?.allowedRuleIds ?? [] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
  ...partial,
});

describe("isProductionDepleted", () => {
  it("is false when any building is running or ready", () => {
    const state: Pick<GameState, "buildings" | "methods" | "inventory"> = {
      inventory: inv([{ id: "item_water", qty: "0" }]),
      methods: [],
      buildings: [building({ id: "b1", buildingDefId: "bdef_field", status: "running" })],
    };
    expect(isProductionDepleted(state)).toBe(false);
  });

  it("is false when well can draw water with no inputs", () => {
    const state: Pick<GameState, "buildings" | "methods" | "inventory"> = {
      inventory: inv([
        { id: "item_water", qty: "0" },
        { id: "item_seed_wheat", qty: "0" },
      ]),
      methods: [
        method({
          id: "method_draw_water_default",
          ruleId: "rule_draw_water",
          inputs: [],
          outputs: [{ item_id: "item_water", qty: 5 }],
        }),
        method({
          id: "method_grow_wheat_default",
          ruleId: "rule_grow_wheat",
          inputs: [
            { item_id: "item_seed_wheat", qty: 1 },
            { item_id: "item_water", qty: 1 },
          ],
        }),
      ],
      buildings: [
        building({
          id: "well",
          buildingDefId: "bdef_well",
          buildingDef: { name: "水井", allowedRuleIds: ["rule_draw_water"] },
        }),
        building({
          id: "field",
          buildingDefId: "bdef_field",
          buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat", "rule_save_seed"] },
        }),
      ],
    };
    expect(isProductionDepleted(state)).toBe(false);
  });

  it("is true when all producible buildings lack materials and none are active", () => {
    const state: Pick<GameState, "buildings" | "methods" | "inventory"> = {
      inventory: inv([
        { id: "item_water", qty: "0" },
        { id: "item_seed_wheat", qty: "0" },
        { id: "item_wheat", qty: "0" },
      ]),
      methods: [
        method({
          id: "method_grow_wheat_default",
          ruleId: "rule_grow_wheat",
          inputs: [
            { item_id: "item_seed_wheat", qty: 1 },
            { item_id: "item_water", qty: 1 },
          ],
        }),
        method({
          id: "method_save_seed_default",
          ruleId: "rule_save_seed",
          inputs: [{ item_id: "item_wheat", qty: 2 }],
        }),
      ],
      buildings: [
        building({
          id: "field",
          buildingDefId: "bdef_field",
          buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat", "rule_save_seed"] },
        }),
      ],
    };
    expect(isProductionDepleted(state)).toBe(true);
  });
});
