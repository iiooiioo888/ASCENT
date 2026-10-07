import { RELEASED_IN_VERSION } from "./config";
import type { BuildingDef, ItemDef, ItemTypeDef, ProductionRuleDef } from "./types";

/** TODO(product) 待確認：汲水工時（遊戲秒，佔位 ≈10 現實秒 @ timeScale=60） */
export const PLACEHOLDER_DRAW_WATER_DURATION_GAME_SEC = 600;
/** TODO(product) 待確認：每次汲水產出水數量；無輸入消耗 */
export const PLACEHOLDER_DRAW_WATER_OUTPUT_QTY = 5;
/** TODO(product) 待確認：留種工時（遊戲秒） */
export const PLACEHOLDER_SAVE_SEED_DURATION_GAME_SEC = 1800;
/** TODO(product) 待確認：留種輸入小麥數量 */
export const PLACEHOLDER_SAVE_SEED_WHEAT_INPUT_QTY = 2;
/** TODO(product) 待確認：留種產出種子數量 */
export const PLACEHOLDER_SAVE_SEED_OUTPUT_QTY = 1;

export const itemTypes: ItemTypeDef[] = [
  { id: "it_crop", code: "crop", name: "作物", is_active: true, released_in_version: RELEASED_IN_VERSION },
  { id: "it_produce", code: "produce", name: "農產加工", is_active: true, released_in_version: RELEASED_IN_VERSION },
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
  {
    id: "rule_draw_water",
    code: "draw_water",
    parent_rule_id: null,
    inputs: [],
    outputs: [{ item_id: "item_water", qty: PLACEHOLDER_DRAW_WATER_OUTPUT_QTY }],
    duration_game_sec: PLACEHOLDER_DRAW_WATER_DURATION_GAME_SEC,
    formulas: {},
    compositions: [],
    overrides: {},
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
  {
    id: "rule_save_seed",
    code: "save_seed",
    parent_rule_id: null,
    inputs: [{ item_id: "item_wheat", qty: PLACEHOLDER_SAVE_SEED_WHEAT_INPUT_QTY }],
    outputs: [{ item_id: "item_seed_wheat", qty: PLACEHOLDER_SAVE_SEED_OUTPUT_QTY }],
    duration_game_sec: PLACEHOLDER_SAVE_SEED_DURATION_GAME_SEC,
    formulas: {},
    compositions: [],
    overrides: {},
    is_active: true,
    released_in_version: RELEASED_IN_VERSION,
  },
];

export const buildingDefs: BuildingDef[] = [
  {
    id: "bdef_field",
    code: "field",
    name: "田",
    system_code: "agriculture",
    allowed_rule_ids: ["rule_grow_wheat", "rule_save_seed"],
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
  {
    id: "bdef_well",
    code: "well",
    name: "水井",
    system_code: "agriculture",
    allowed_rule_ids: ["rule_draw_water"],
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
};

export const METHOD_NAME: Record<string, string> = {
  method_grow_wheat_default: "種植小麥",
  method_grow_wheat_water_saving: "省水種植",
  method_mill_flour_default: "磨粉",
  method_mix_feed_default: "拌飼料",
  method_make_dough_default: "和麵",
  method_bake_bread_default: "烘烤麵包",
  method_bake_bread_batch: "批量烘烤",
  method_draw_water_default: "汲水",
  method_save_seed_default: "留種",
};

/** 開局預放建築（與 seed.ts 對齊；**已拍板 D2**：含 1 座水井） */
export const seedPlacedBuildingDefIds = ["bdef_field", "bdef_mill", "bdef_oven", "bdef_well"] as const;
