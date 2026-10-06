import type { Building, InvRow, Method } from "../types";
import {
  demoFieldIdle,
  growWheatDefault,
  mixFeedDefault,
} from "../prb-demo/fixtures";

export { demoFieldIdle, growWheatDefault, mixFeedDefault };

const item = (itemId: string, quantity: string): InvRow => ({
  itemId,
  quantity,
  item: { code: itemId, layer: "T", derivedTier: 0 },
});

/** Zero stock — triggers U6 depletion banner in harness when combined with {@link demoDepletedBuildings}. */
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

export const demoMillFlourDefault: Method = {
  id: "method_mill_flour_default",
  code: "method_mill_flour_default",
  ruleId: "rule_mill_flour",
  durationGameSec: 1800,
  inputs: [{ item_id: "item_wheat", qty: 1 }],
  outputs: [{ item_id: "item_flour", qty: 1 }],
};

export const demoPrcMethods: Method[] = [growWheatDefault, mixFeedDefault, demoMillFlourDefault];

export const demoMillIdle: Building = {
  id: "demo-mill-idle",
  status: "idle",
  buildingDefId: "bdef_mill",
  buildingDef: { name: "磨坊", allowedRuleIds: ["rule_mill_flour", "rule_mix_feed"] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

export const demoDepletedBuildings: Building[] = [demoFieldIdle, demoMillIdle];

export function demoMethodsByRule(): Map<string, Method[]> {
  const map = new Map<string, Method[]>();
  for (const method of demoPrcMethods) {
    const arr = map.get(method.ruleId) ?? [];
    arr.push(method);
    map.set(method.ruleId, arr);
  }
  return map;
}
