import type { Building, InvRow } from "../types";

const item = (itemId: string, quantity: string): InvRow => ({
  itemId,
  quantity,
  item: { code: itemId, layer: "T", derivedTier: 0 },
});

/** Zero stock — triggers U6 depletion banner in harness. */
export const demoDepletedInventory: InvRow[] = [
  item("item_seed_wheat", "0"),
  item("item_water", "0"),
  item("item_wheat", "0"),
  item("item_straw", "0"),
  item("item_flour", "0"),
  item("item_feed", "1"),
  item("item_dough", "0"),
  item("item_bread", "2"),
];

export { growWheatDefault, mixFeedDefault, demoFieldIdle } from "../prb-demo/fixtures";

export const demoMillIdle: Building = {
  id: "demo-mill-idle",
  status: "idle",
  buildingDefId: "bdef_mill",
  buildingDef: { name: "磨坊", allowedRuleIds: ["rule_mill_flour", "rule_mix_feed"] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};
