import type { Building, InvRow, Method } from "../types";

export const prgInventory: InvRow[] = [
  { itemId: "item_bread", quantity: "2", item: { code: "bread", layer: "P", derivedTier: 2 } },
  { itemId: "item_seed_wheat", quantity: "40", item: { code: "seed_wheat", layer: "T", derivedTier: 1 } },
  { itemId: "item_water", quantity: "79.5", item: { code: "water", layer: "T", derivedTier: 1 } },
];

export const prgBuildings: Building[] = [
  {
    id: "pg_field",
    status: "running",
    buildingDefId: "bdef_field",
    buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
    methodId: "method_grow_wheat_default",
    queue: [{ elapsedGameSec: 1800, durationGameSec: 3600 }],
    bufferedOutputs: {},
  },
  {
    id: "pg_mill",
    status: "ready",
    buildingDefId: "bdef_mill",
    buildingDef: { name: "磨坊", allowedRuleIds: ["rule_mill_flour", "rule_mix_feed"] },
    methodId: "method_mill_flour_default",
    queue: [],
    bufferedOutputs: { item_flour: 1 },
  },
  {
    id: "pg_silo",
    status: "idle",
    buildingDefId: "bdef_silo",
    buildingDef: { name: "倉", allowedRuleIds: [] },
    methodId: null,
    queue: [],
    bufferedOutputs: {},
  },
];

export const growMethod: Method = {
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
