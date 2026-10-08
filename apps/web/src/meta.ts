import { playableMethodNames as SHARED_METHOD_NAMES } from "@ascent/shared";

/** TODO(product): 待確認 — 物品顯示名／圖示單一來源（catalog 尚無 name 欄，暫留 web） */
export const ITEM_META: Record<string, { name: string; icon: string }> = {
  item_seed_wheat: { name: "小麥種子", icon: "🌱" },
  item_wheat: { name: "小麥", icon: "🌾" },
  item_straw: { name: "秸稈", icon: "🪵" },
  item_water: { name: "水", icon: "💧" },
  item_flour: { name: "麵粉", icon: "🥣" },
  item_feed: { name: "飼料", icon: "🧺" },
  item_dough: { name: "麵團", icon: "⚪" },
  item_bread: { name: "麵包", icon: "🍞" },
  item_gold: { name: "金幣", icon: "🪙" },
  item_oil: { name: "石油", icon: "🛢️" },
  item_iron_ore: { name: "鐵礦", icon: "🪨" },
  item_copper_ore: { name: "銅礦", icon: "🟠" },
  item_stone: { name: "石料", icon: "🗿" },
  item_clay: { name: "黏土", icon: "🟤" },
  item_sand: { name: "砂", icon: "⏳" },
  item_sulfur: { name: "硫磺", icon: "💛" },
  item_coal: { name: "煤", icon: "⬛" },
  item_salt: { name: "鹽", icon: "🧂" },
  item_log: { name: "原木", icon: "🪵" },
  item_iron_ingot: { name: "鐵錠", icon: "🔩" },
  item_copper_ingot: { name: "銅錠", icon: "🟠" },
  item_coke: { name: "焦炭", icon: "🖤" },
  item_charcoal: { name: "木炭", icon: "🪵" },
  item_lime: { name: "石灰", icon: "⚪" },
  item_acid: { name: "粗酸", icon: "🧪" },
  item_glass: { name: "玻璃", icon: "🪟" },
  item_brick: { name: "磚", icon: "🧱" },
  item_plank: { name: "木板", icon: "📏" },
  item_steel: { name: "鋼", icon: "⚙️" },
  item_nails: { name: "釘", icon: "📌" },
  item_wire: { name: "銅線", icon: "🧵" },
  item_tools: { name: "工具", icon: "🔨" },
  item_gears: { name: "齒輪", icon: "⚙️" },
  item_glassware: { name: "玻璃器皿", icon: "🧴" },
  item_concrete: { name: "混凝土", icon: "🏗️" },
  item_alkali: { name: "鹼", icon: "🧴" },
  item_steam: { name: "蒸汽", icon: "💨" },
  item_machine: { name: "機械", icon: "🏭" },
  item_engine: { name: "蒸汽機", icon: "🚂" },
  item_fertilizer: { name: "肥料", icon: "🌱" },
};

/** P3-5: method display names from shared catalog (avoid drift). */
export const METHOD_NAME: Record<string, string> = { ...SHARED_METHOD_NAMES };

export const BUILDING_ICON: Record<string, string> = {
  bdef_field: "🌾",
  bdef_silo: "🏚️",
  bdef_mill: "⚙️",
  bdef_oven: "🔥",
  bdef_well: "💧",
  bdef_trading_post: "🏪",
  bdef_mine: "⛏️",
  bdef_quarry: "⛰️",
  bdef_forest: "🌲",
  bdef_smelter: "🔥",
  bdef_kiln: "🏺",
  bdef_chem_works: "⚗️",
  bdef_workshop: "🔨",
  bdef_machine_shop: "🏭",
  bdef_boiler: "💨",
};

export function itemLabel(id: string) {
  return ITEM_META[id]?.name ?? id.replace(/^item_/, "").replace(/_/g, " ");
}
