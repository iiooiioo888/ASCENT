import type { Building, InvRow, Method } from "../types";
import { TRADING_POST_BUILDING_DEF_ID } from "../tradingPost";
import { WELL_BUILDING_DEF_ID } from "../resource-loop-copy";
import { defaultMarketSnapshotForTests } from "../test/marketFixture";

export const drawWaterMethod: Method = {
  id: "method_draw_water_default",
  code: "method_draw_water_default",
  ruleId: "rule_draw_water",
  durationGameSec: 600,
  inputs: [],
  outputs: [{ item_id: "item_water", qty: 5 }],
};

export const demoWellBuilding: Building = {
  id: "b_well_1",
  status: "idle",
  buildingDefId: WELL_BUILDING_DEF_ID,
  buildingDef: { name: "水井", allowedRuleIds: ["rule_draw_water"] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

export const demoTradingPostBuilding: Building = {
  id: "pb_trading_post",
  status: "idle",
  buildingDefId: TRADING_POST_BUILDING_DEF_ID,
  buildingDef: { name: "莊外商行", allowedRuleIds: [] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

const item = (itemId: string, quantity: string, code: string): InvRow => ({
  itemId,
  quantity,
  item: { code, layer: "T", derivedTier: 1 },
});

export const depletedWithGoldInventory: InvRow[] = [
  item("item_gold", "10", "item_gold"),
  item("item_seed_wheat", "0", "seed_wheat"),
  item("item_water", "0", "water"),
  item("item_wheat", "2", "wheat"),
  item("item_bread", "1", "bread"),
];

export const marketSnapshotGold10 = defaultMarketSnapshotForTests({
  gold: 10,
  holdings: {
    item_gold: 10,
    item_bread: 1,
    item_seed_wheat: 0,
    item_water: 0,
    item_wheat: 2,
  },
});
