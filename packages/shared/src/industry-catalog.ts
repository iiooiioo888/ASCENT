import type { BuildingDef, ItemDef, ItemTypeDef, ProductionRuleDef } from "./types";

/**
 * 可玩產業擴充（礦、化、工、能源、林木）。
 * 不寫進農業切片的 `items`／`rules`（該切片方式數鎖在 5–10）。
 * 由 `playable-catalog` 合併後才進種子與對局。
 * 建築不佔農業槽，見 land-config。
 */
export const INDUSTRY_RELEASE = "industry-1";

function item(
  id: string,
  code: string,
  type_id: string,
  layer: ItemDef["layer"],
  derived_tier: number,
): ItemDef {
  return {
    id,
    code,
    type_id,
    layer,
    derived_tier,
    is_active: true,
    released_in_version: INDUSTRY_RELEASE,
  };
}

function rule(
  id: string,
  code: string,
  inputs: ProductionRuleDef["inputs"],
  outputs: ProductionRuleDef["outputs"],
  duration_game_sec: number,
): ProductionRuleDef {
  return {
    id,
    code,
    parent_rule_id: null,
    inputs,
    outputs,
    duration_game_sec,
    formulas: {},
    compositions: [],
    overrides: {},
    is_active: true,
    released_in_version: INDUSTRY_RELEASE,
  };
}

function building(
  id: string,
  code: string,
  name: string,
  system_code: string,
  allowed_rule_ids: string[],
): BuildingDef {
  return {
    id,
    code,
    name,
    system_code,
    allowed_rule_ids,
    queue_limit: 1,
    is_active: true,
    released_in_version: INDUSTRY_RELEASE,
  };
}

const io = (item_id: string, qty: number) => ({ item_id, qty });

export const industryItemTypes: ItemTypeDef[] = [
  { id: "it_mineral", code: "mineral", name: "礦物", is_active: true, released_in_version: INDUSTRY_RELEASE },
  { id: "it_chemical", code: "chemical", name: "化工", is_active: true, released_in_version: INDUSTRY_RELEASE },
  { id: "it_industrial", code: "industrial", name: "工業", is_active: true, released_in_version: INDUSTRY_RELEASE },
  { id: "it_energy", code: "energy", name: "能源", is_active: true, released_in_version: INDUSTRY_RELEASE },
  { id: "it_timber", code: "timber", name: "木材", is_active: true, released_in_version: INDUSTRY_RELEASE },
];

export const industryItems: ItemDef[] = [
  item("item_iron_ore", "iron_ore", "it_mineral", "T", 1),
  item("item_copper_ore", "copper_ore", "it_mineral", "T", 1),
  item("item_silver_ore", "silver_ore", "it_mineral", "T", 1),
  item("item_gold_ore", "gold_ore", "it_mineral", "T", 1),
  item("item_stone", "stone", "it_mineral", "T", 1),
  item("item_clay", "clay", "it_mineral", "T", 1),
  item("item_sand", "sand", "it_mineral", "T", 1),
  item("item_sulfur", "sulfur", "it_mineral", "T", 1),
  item("item_coal", "coal", "it_energy", "T", 1),
  item("item_salt", "salt", "it_chemical", "T", 1),
  item("item_log", "log", "it_timber", "T", 1),
  item("item_iron_ingot", "iron_ingot", "it_industrial", "P", 1),
  item("item_copper_ingot", "copper_ingot", "it_industrial", "P", 1),
  item("item_silver_ingot", "silver_ingot", "it_industrial", "P", 1),
  item("item_gold_ingot", "gold_ingot", "it_industrial", "P", 1),
  item("item_coke", "coke", "it_energy", "P", 1),
  item("item_charcoal", "charcoal", "it_energy", "P", 1),
  item("item_lime", "lime", "it_chemical", "P", 1),
  item("item_acid", "acid", "it_chemical", "P", 1),
  item("item_glass", "glass", "it_chemical", "P", 1),
  item("item_brick", "brick", "it_industrial", "P", 1),
  item("item_plank", "plank", "it_timber", "P", 1),
  item("item_steel", "steel", "it_industrial", "P", 2),
  item("item_nails", "nails", "it_industrial", "P", 2),
  item("item_wire", "wire", "it_industrial", "P", 2),
  item("item_tools", "tools", "it_industrial", "P", 2),
  item("item_gears", "gears", "it_industrial", "P", 2),
  item("item_glassware", "glassware", "it_industrial", "P", 2),
  item("item_concrete", "concrete", "it_industrial", "P", 2),
  item("item_alkali", "alkali", "it_chemical", "P", 2),
  item("item_steam", "steam", "it_energy", "P", 2),
  item("item_machine", "machine", "it_industrial", "P", 3),
  item("item_engine", "engine", "it_industrial", "P", 3),
  item("item_fertilizer", "fertilizer", "it_chemical", "P", 3),
];

/** CURR-RES：採礦耗 1 水（對齊 P4-S4 typed ores）。 */
const MINE_WATER_INPUT: ProductionRuleDef["inputs"] = [io("item_water", 1)];

export const industryRules: ProductionRuleDef[] = [
  rule("rule_mine_iron", "mine_iron", MINE_WATER_INPUT, [io("item_iron_ore", 2)], 2400),
  rule("rule_mine_copper", "mine_copper", MINE_WATER_INPUT, [io("item_copper_ore", 2)], 2400),
  rule("rule_mine_silver", "mine_silver", MINE_WATER_INPUT, [io("item_silver_ore", 2)], 2400),
  rule("rule_mine_gold", "mine_gold", MINE_WATER_INPUT, [io("item_gold_ore", 1)], 2400),
  rule("rule_mine_coal", "mine_coal", [], [io("item_coal", 2)], 2400),
  rule("rule_mine_sulfur", "mine_sulfur", [], [io("item_sulfur", 1)], 3000),
  rule("rule_quarry_stone", "quarry_stone", [], [io("item_stone", 2)], 1800),
  rule("rule_dig_clay", "dig_clay", [], [io("item_clay", 2)], 1800),
  rule("rule_dig_sand", "dig_sand", [], [io("item_sand", 2)], 1800),
  rule("rule_fell_timber", "fell_timber", [], [io("item_log", 2)], 2400),
  rule(
    "rule_smelt_iron",
    "smelt_iron",
    [io("item_iron_ore", 2), io("item_coal", 1)],
    [io("item_iron_ingot", 1)],
    2400,
  ),
  rule(
    "rule_smelt_iron_charcoal",
    "smelt_iron_charcoal",
    [io("item_iron_ore", 2), io("item_charcoal", 1)],
    [io("item_iron_ingot", 1)],
    3000,
  ),
  rule(
    "rule_smelt_copper",
    "smelt_copper",
    [io("item_copper_ore", 2), io("item_coal", 1)],
    [io("item_copper_ingot", 1)],
    2400,
  ),
  rule(
    "rule_smelt_silver",
    "smelt_silver",
    [io("item_silver_ore", 2), io("item_coal", 1)],
    [io("item_silver_ingot", 1)],
    2400,
  ),
  rule(
    "rule_smelt_gold",
    "smelt_gold",
    [io("item_gold_ore", 1), io("item_coal", 1)],
    [io("item_gold_ingot", 1)],
    2400,
  ),
  rule("rule_make_coke", "make_coke", [io("item_coal", 2)], [io("item_coke", 1)], 1800),
  rule(
    "rule_make_steel",
    "make_steel",
    [io("item_iron_ingot", 1), io("item_coke", 1)],
    [io("item_steel", 1)],
    3000,
  ),
  rule(
    "rule_fire_brick",
    "fire_brick",
    [io("item_clay", 2), io("item_coal", 1)],
    [io("item_brick", 2)],
    1800,
  ),
  rule(
    "rule_make_glass",
    "make_glass",
    [io("item_sand", 2), io("item_coal", 1)],
    [io("item_glass", 1)],
    2400,
  ),
  rule(
    "rule_burn_lime",
    "burn_lime",
    [io("item_stone", 2), io("item_coal", 1)],
    [io("item_lime", 1)],
    1800,
  ),
  rule("rule_burn_charcoal", "burn_charcoal", [io("item_straw", 2)], [io("item_charcoal", 1)], 1200),
  rule("rule_burn_log_charcoal", "burn_log_charcoal", [io("item_log", 1)], [io("item_charcoal", 1)], 1200),
  rule(
    "rule_cast_concrete",
    "cast_concrete",
    [io("item_stone", 1), io("item_sand", 1), io("item_lime", 1)],
    [io("item_concrete", 1)],
    2400,
  ),
  rule("rule_extract_salt", "extract_salt", [io("item_water", 2)], [io("item_salt", 1)], 1200),
  rule(
    "rule_make_acid",
    "make_acid",
    [io("item_sulfur", 1), io("item_water", 1)],
    [io("item_acid", 1)],
    1800,
  ),
  rule(
    "rule_make_alkali",
    "make_alkali",
    [io("item_salt", 1), io("item_lime", 1)],
    [io("item_alkali", 1)],
    2400,
  ),
  rule(
    "rule_mix_fertilizer",
    "mix_fertilizer",
    [io("item_feed", 1), io("item_alkali", 1)],
    [io("item_fertilizer", 1)],
    2400,
  ),
  rule("rule_saw_plank", "saw_plank", [io("item_log", 1)], [io("item_plank", 2)], 1200),
  rule("rule_forge_nails", "forge_nails", [io("item_iron_ingot", 1)], [io("item_nails", 4)], 1200),
  rule("rule_draw_wire", "draw_wire", [io("item_copper_ingot", 1)], [io("item_wire", 2)], 1800),
  rule("rule_forge_tools", "forge_tools", [io("item_iron_ingot", 1)], [io("item_tools", 1)], 1800),
  rule("rule_forge_gears", "forge_gears", [io("item_iron_ingot", 1)], [io("item_gears", 1)], 1800),
  rule("rule_blow_glassware", "blow_glassware", [io("item_glass", 1)], [io("item_glassware", 1)], 1800),
  rule(
    "rule_assemble_machine",
    "assemble_machine",
    [io("item_gears", 2), io("item_wire", 1), io("item_tools", 1)],
    [io("item_machine", 1)],
    3600,
  ),
  rule(
    "rule_build_engine",
    "build_engine",
    [io("item_steel", 1), io("item_gears", 1), io("item_steam", 2)],
    [io("item_engine", 1)],
    3600,
  ),
  rule("rule_raise_steam", "raise_steam", [io("item_coke", 1)], [io("item_steam", 2)], 1200),
];

export const industryBuildingDefs: BuildingDef[] = [
  building("bdef_mine", "mine", "礦坑", "mining", [
    "rule_mine_iron",
    "rule_mine_copper",
    "rule_mine_silver",
    "rule_mine_gold",
    "rule_mine_coal",
    "rule_mine_sulfur",
  ]),
  building("bdef_quarry", "quarry", "採石場", "mining", [
    "rule_quarry_stone",
    "rule_dig_clay",
    "rule_dig_sand",
  ]),
  building("bdef_forest", "forest", "林地", "timber", ["rule_fell_timber"]),
  building("bdef_smelter", "smelter", "冶煉爐", "mining", [
    "rule_smelt_iron",
    "rule_smelt_iron_charcoal",
    "rule_smelt_copper",
    "rule_smelt_silver",
    "rule_smelt_gold",
    "rule_make_coke",
    "rule_make_steel",
  ]),
  building("bdef_kiln", "kiln", "窯", "chemical", [
    "rule_fire_brick",
    "rule_make_glass",
    "rule_burn_lime",
    "rule_burn_charcoal",
    "rule_burn_log_charcoal",
    "rule_cast_concrete",
  ]),
  building("bdef_chem_works", "chem_works", "化工廠", "chemical", [
    "rule_extract_salt",
    "rule_make_acid",
    "rule_make_alkali",
    "rule_mix_fertilizer",
  ]),
  building("bdef_workshop", "workshop", "工坊", "industry", [
    "rule_saw_plank",
    "rule_forge_nails",
    "rule_draw_wire",
    "rule_forge_tools",
    "rule_forge_gears",
    "rule_blow_glassware",
  ]),
  building("bdef_machine_shop", "machine_shop", "機械廠", "industry", [
    "rule_assemble_machine",
    "rule_build_engine",
  ]),
  building("bdef_boiler", "boiler", "鍋爐", "energy", ["rule_raise_steam"]),
];

export const INDUSTRY_BUILDING_DEF_IDS: readonly string[] = industryBuildingDefs.map((b) => b.id);

const METHOD_LABELS: Record<string, string> = {
  mine_iron: "開採鐵礦",
  mine_copper: "開採銅礦",
  mine_silver: "開採銀礦",
  mine_gold: "開採金礦",
  mine_coal: "開採煤",
  mine_sulfur: "開採硫磺",
  quarry_stone: "採石",
  dig_clay: "挖黏土",
  dig_sand: "挖砂",
  fell_timber: "伐木",
  smelt_iron: "煉鐵",
  smelt_iron_charcoal: "木炭煉鐵",
  smelt_copper: "煉銅",
  smelt_silver: "煉銀",
  smelt_gold: "煉金",
  make_coke: "煉焦",
  make_steel: "煉鋼",
  fire_brick: "燒磚",
  make_glass: "製玻璃",
  burn_lime: "燒石灰",
  burn_charcoal: "秸稈燒炭",
  burn_log_charcoal: "原木燒炭",
  cast_concrete: "拌混凝土",
  extract_salt: "晒鹽",
  make_acid: "製粗酸",
  make_alkali: "製鹼",
  mix_fertilizer: "製肥料",
  saw_plank: "鋸木板",
  forge_nails: "打釘",
  draw_wire: "拉銅線",
  forge_tools: "打工具",
  forge_gears: "鑄齒輪",
  blow_glassware: "吹玻璃器皿",
  assemble_machine: "組機械",
  build_engine: "造蒸汽機",
  raise_steam: "起蒸汽",
};

export const industryMethodNames: Record<string, string> = Object.fromEntries(
  Object.entries(METHOD_LABELS).map(([code, name]) => [`method_${code}_default`, name]),
);
