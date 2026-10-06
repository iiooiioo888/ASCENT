import { describe, expect, it } from "vitest";
import { canAffordInputs, inventoryQtyMap } from "./inventory";
import { hasAffordableStart, isResourceDepleted } from "./depletion";
import type { Building, InvRow, Method } from "./types";

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

const fieldBuilding = (status: Building["status"]): Building => ({
  id: "b_field",
  status,
  buildingDefId: "bdef_field",
  buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
  methodId: status === "idle" ? null : growWheat.id,
  queue: [],
  bufferedOutputs: {},
});

const methodsByRule = new Map<string, Method[]>([["rule_grow_wheat", [growWheat]]]);

describe("isResourceDepleted", () => {
  it("is false when there are no placed buildings (empty settlement)", () => {
    const inventory = [row("item_seed_wheat", "0"), row("item_water", "0")];
    expect(isResourceDepleted([], inventory, methodsByRule)).toBe(false);
  });

  it("is false when at least one method is affordable", () => {
    const inventory = [row("item_seed_wheat", "1"), row("item_water", "1")];
    expect(isResourceDepleted([fieldBuilding("idle")], inventory, methodsByRule)).toBe(false);
  });

  it("is false when a building is ready to collect", () => {
    const inventory = [row("item_seed_wheat", "0"), row("item_water", "0")];
    expect(isResourceDepleted([fieldBuilding("ready")], inventory, methodsByRule)).toBe(false);
  });

  it("is false when a building is running", () => {
    const inventory = [row("item_seed_wheat", "0"), row("item_water", "0")];
    expect(isResourceDepleted([fieldBuilding("running")], inventory, methodsByRule)).toBe(false);
  });

  it("is true when all methods lack inputs and nothing is active", () => {
    const inventory = [row("item_seed_wheat", "0"), row("item_water", "0")];
    expect(isResourceDepleted([fieldBuilding("idle")], inventory, methodsByRule)).toBe(true);
  });

  it("is true when inventory quantities are non-finite (NaN) — aligns with U2 canAffordInputs", () => {
    const inventory = [row("item_seed_wheat", "not-a-number"), row("item_water", "1")];
    expect(isResourceDepleted([fieldBuilding("idle")], inventory, methodsByRule)).toBe(true);
  });

  it("is true when stock quantity is negative — aligns with isValidQty", () => {
    const inventory = [row("item_seed_wheat", "1"), row("item_water", "-1")];
    expect(isResourceDepleted([fieldBuilding("idle")], inventory, methodsByRule)).toBe(true);
  });
});

describe("isValidQty regression (U6 ↔ U2 canAffordInputs)", () => {
  it("water=-1 must not count as affordable (regression if isValidQty is removed)", () => {
    const inventory = [row("item_seed_wheat", "10"), row("item_water", "-1")];
    const stock = inventoryQtyMap(inventory);
    expect(canAffordInputs(stock, growWheat.inputs)).toBe(false);
    expect(hasAffordableStart([fieldBuilding("idle")], inventory, methodsByRule)).toBe(false);
    expect(isResourceDepleted([fieldBuilding("idle")], inventory, methodsByRule)).toBe(true);
  });
});

describe("hasAffordableStart", () => {
  it("returns true for running even without stock", () => {
    expect(hasAffordableStart([fieldBuilding("running")], [], methodsByRule)).toBe(true);
  });
});
