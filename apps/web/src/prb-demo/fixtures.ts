import type { Building, InvRow, Method } from "../types";

const item = (itemId: string, quantity: string): InvRow => ({
  itemId,
  quantity,
  item: { code: itemId, layer: "T", derivedTier: 0 },
});

export const demoInventoryShortWater: InvRow[] = [
  item("item_seed_wheat", "40"),
  item("item_water", "0.5"),
  item("item_wheat", "0"),
  item("item_straw", "0"),
  item("item_flour", "0"),
  item("item_feed", "0"),
  item("item_dough", "0"),
  item("item_bread", "0"),
];

export const growWheatDefault: Method = {
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

export const raiseLivestockDefault: Method = {
  id: "method_raise_livestock_default",
  code: "raise_livestock_default",
  ruleId: "rule_raise_livestock",
  durationGameSec: 2400,
  inputs: [
    { item_id: "item_feed", qty: 1 },
    { item_id: "item_water", qty: 1 },
  ],
  outputs: [
    { item_id: "item_egg", qty: 2 },
    { item_id: "item_milk", qty: 1 },
  ],
};

export const mixFeedDefault: Method = {
  id: "method_mix_feed_default",
  code: "mix_feed_default",
  ruleId: "rule_mix_feed",
  durationGameSec: 1200,
  inputs: [
    { item_id: "item_straw", qty: 1 },
    { item_id: "item_wheat", qty: 1 },
  ],
  outputs: [{ item_id: "item_feed", qty: 1 }],
};

export const demoFieldIdle: Building = {
  id: "demo-field",
  status: "idle",
  buildingDefId: "bdef_field",
  buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

export const demoRanchIdle: Building = {
  id: "demo-ranch",
  status: "idle",
  buildingDefId: "bdef_ranch",
  buildingDef: { name: "牧場", allowedRuleIds: ["rule_raise_livestock"] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
  autoEnabled: false,
  autoMethodId: null,
};

export const demoMillRunning: Building = {
  id: "demo-mill",
  status: "running",
  buildingDefId: "bdef_mill",
  buildingDef: { name: "磨坊", allowedRuleIds: ["rule_mill_flour", "rule_mix_feed"] },
  methodId: "method_mix_feed_default",
  queue: [{ elapsedGameSec: 400, durationGameSec: 1200 }],
  bufferedOutputs: {},
};
