import type { Building, InvRow, Method } from "../types";

export const growWheatDefault: Method = {
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
};

export const demoFieldReady: Building = {
  id: "demo_field",
  status: "ready",
  buildingDefId: "bdef_field",
  buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
  methodId: "method_grow_wheat_default",
  queue: [],
  bufferedOutputs: { item_wheat: 2, item_straw: 1 },
};

function invRow(itemId: string, quantity: string, code: string): InvRow {
  return {
    itemId,
    quantity,
    item: { code, layer: "T", derivedTier: 1 },
  };
}

export const demoInventoryAfterCollect: InvRow[] = [
  invRow("item_seed_wheat", "39", "seed_wheat"),
  invRow("item_water", "79", "water"),
  invRow("item_wheat", "2", "wheat"),
  invRow("item_straw", "1", "straw"),
  invRow("item_flour", "0", "flour"),
  invRow("item_feed", "0", "feed"),
  invRow("item_dough", "0", "dough"),
  invRow("item_bread", "0", "bread"),
];
