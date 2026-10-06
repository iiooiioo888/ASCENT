import { RELEASED_IN_VERSION } from "./config";
import { ITEM_CURRENCY_TYPE_ID, ITEM_GOLD_ID, STARTING_GOLD } from "./market-config";
import type { BuildingDef, ItemDef, ItemTypeDef, ProductionRuleDef } from "./types";

export const itemTypes: ItemTypeDef[] = [
  { id: "it_crop", code: "crop", name: "作物", is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "it_produce", code: "produce", name: "農產加工", is_active: true, released_in_version: RELEASED_IN_VERSION },
  // TODO(product): 貨幣是否獨立 Player.gold 欄未定；現用 inventory 物品佔位。
  { id: ITEM_CURRENCY_TYPE_ID, code: "currency", name: "貨幣", is_active: true, released_in_version: RELEASED_IN_VERSION },
];

export const items: ItemDef[] = [
  { id: "item_seed_wheat", code: "seed_wheat", type_id: "it_crop", layer: "T", derived_tier: 1, is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "item_wheat", code: "wheat", type_id: "it_crop", layer: "T", derived_tier: 1, is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "item_straw", code: "straw", type_id: "it_crop", layer: "T", derived_tier: 1, is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "item_water", code: "water", type_id: "it_crop", layer: "T", derived_tier: 1, is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "item_flour", code: "flour", type_id: "it_produce", layer: "P", derived_tier: 1, is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "item_feed", code: "feed", type_id: "it_produce", layer: "P", derived_tier: 1, is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "item_dough", code: "dough", type_id: "it_produce", layer: "P", derived_tier: 1, is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "item_bread", code: "bread", type_id: "it_produce", layer: "P", derived_tier: 2, is_active: true, released_in_version: RELEASED_IN_VERSION },
  // TODO(product): 金幣顯示名／圖示；不進生產 DAG。
  {
    id: ITEM_GOLD_ID,
    code: "gold",
    type_id: ITEM_CURRENCY_TYPE_ID,
    layer: "C",
    derived_tier: 0,
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
];

export const rules: ProductionRuleDef[] = [
  {
    id: "rule_grow_wheat",
    code: "grow_wheat",
    parent_rule_id: null,
    inputs: [
      { key: "seed", item_id: "item_seed_wheat", qty: 1 },
      { key: "water", item_id: "item_water", qty: 1 },
    ],
    outputs: [
      { item_id: "item_wheat", qty: 2 },
      { item_id: "item_straw", qty: 1 },
    ],
    duration_game_sec: 3600,
    formulas: {},
    compositions: [],
    overrides: {},
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
    optimizations: [{ code: "water_saving", input_factor: { water: 0.5 }, duration_factor: 1.5 }],
  },
  {
    id: "rule_mill_flour",
    code: "mill_flour",
    parent_rule_id: null,
    inputs: [{ item_id: "item_wheat", qty: 2 }],
    outputs: [{ item_id: "item_flour", qty: 1 }],
    duration_game_sec: 1800,
    formulas: {},
    compositions: [],
    overrides: {},
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
  {
    id: "rule_mix_feed",
    code: "mix_feed",
    parent_rule_id: null,
    inputs: [
      { item_id: "item_straw", qty: 2 },
      { item_id: "item_wheat", qty: 1 },
    ],
    outputs: [{ item_id: "item_feed", qty: 1 }],
    duration_game_sec: 1200,
    formulas: {},
    compositions: [],
    overrides: {},
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
  {
    id: "rule_make_dough",
    code: "make_dough",
    parent_rule_id: null,
    inputs: [
      { item_id: "item_flour", qty: 1 },
      { item_id: "item_water", qty: 1 },
    ],
    outputs: [{ item_id: "item_dough", qty: 1 }],
    duration_game_sec: 600,
    formulas: {},
    compositions: [],
    overrides: {},
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
  {
    id: "rule_bake_bread",
    code: "bake_bread",
    parent_rule_id: null,
    inputs: [{ item_id: "item_dough", qty: 1 }],
    outputs: [{ item_id: "item_bread", qty: 1 }],
    duration_game_sec: 1200,
    formulas: {},
    compositions: [],
    overrides: {},
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
    optimizations: [{ code: "batch", output_factor: 2, input_factor: { item_dough: 2 } }],
  },
];

export const buildingDefs: BuildingDef[] = [
  {
    id: "bdef_field",
    code: "field",
    name: "田",
    system_code: "agriculture",
    allowed_rule_ids: ["rule_grow_wheat"],
    queue_limit: 1,
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
  {
    id: "bdef_silo",
    code: "silo",
    name: "倉",
    system_code: "agriculture",
    allowed_rule_ids: [],
    queue_limit: 1,
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
  {
    id: "bdef_mill",
    code: "mill",
    name: "磨坊",
    system_code: "agriculture",
    allowed_rule_ids: ["rule_mill_flour", "rule_mix_feed"],
    queue_limit: 1,
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
  {
    id: "bdef_oven",
    code: "oven",
    name: "爐",
    system_code: "agriculture",
    allowed_rule_ids: ["rule_make_dough", "rule_bake_bread"],
    queue_limit: 1,
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
];

export const startingInventory: Record<string, number> = {
  item_seed_wheat: 40,
  item_wheat: 0,
  item_straw: 0,
  item_water: 80,
  item_flour: 0,
  item_feed: 0,
  item_dough: 0,
  item_bread: 0,
  [ITEM_GOLD_ID]: STARTING_GOLD,
};

export const METHOD_NAME: Record<string, string> = {
  method_grow_wheat_default: "種植小麥",
  method_grow_wheat_water_saving: "省水種植",
  method_mill_flour_default: "磨粉",
  method_mix_feed_default: "拌飼料",
  method_make_dough_default: "和麵",
  method_bake_bread_default: "烘烤麵包",
  method_bake_bread_batch: "批量烘烤",
};
