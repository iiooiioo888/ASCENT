import type { Building, InvRow, Method } from "../types";

const growMethods: Method[] = [
  {
    id: "method_grow_wheat_default",
    code: "method_grow_wheat_default",
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
  },
  {
    id: "method_grow_wheat_water_saving",
    code: "method_grow_wheat_water_saving",
    ruleId: "rule_grow_wheat",
    durationGameSec: 5400,
    inputs: [
      { item_id: "item_seed_wheat", qty: 1 },
      { item_id: "item_water", qty: 0.5 },
    ],
    outputs: [
      { item_id: "item_wheat", qty: 2 },
      { item_id: "item_straw", qty: 1 },
    ],
  },
];

export const demoFieldBuilding: Building = {
  id: "demo_field",
  status: "idle",
  buildingDefId: "bdef_field",
  buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

export const demoFieldMethods = growMethods;

export const demoSiloBuilding: Building = {
  id: "demo_silo",
  status: "idle",
  buildingDefId: "bdef_silo",
  buildingDef: { name: "倉", allowedRuleIds: [] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

export const demoMillBuilding: Building = {
  id: "demo_mill",
  status: "ready",
  buildingDefId: "bdef_mill",
  buildingDef: { name: "磨坊", allowedRuleIds: ["rule_mill_flour", "rule_mix_feed"] },
  methodId: "method_mill_flour_default",
  queue: [],
  bufferedOutputs: { item_flour: 1 },
};

export const demoMillMethods: Method[] = [
  {
    id: "method_mill_flour_default",
    code: "method_mill_flour_default",
    ruleId: "rule_mill_flour",
    durationGameSec: 1800,
    inputs: [{ item_id: "item_wheat", qty: 1 }],
    outputs: [{ item_id: "item_flour", qty: 1 }],
  },
];

function invRow(itemId: string, quantity: string, code: string): InvRow {
  return {
    itemId,
    quantity,
    item: { code, layer: "T", derivedTier: 1 },
  };
}

/** Staged UI: water 79.5 for U3; card error matches live API when water is 0 and start fails. */
export const demoInventory: InvRow[] = [
  invRow("item_seed_wheat", "40", "seed_wheat"),
  invRow("item_water", "79.5", "water"),
  invRow("item_wheat", "0", "wheat"),
  invRow("item_straw", "0", "straw"),
  invRow("item_flour", "0", "flour"),
  invRow("item_feed", "0", "feed"),
  invRow("item_dough", "0", "dough"),
  invRow("item_bread", "0", "bread"),
];
