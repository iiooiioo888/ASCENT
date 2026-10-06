export const ITEM_META: Record<string, { name: string; icon: string }> = {
  item_seed_wheat: { name: "小麥種子", icon: "🌱" },
  item_wheat: { name: "小麥", icon: "🌾" },
  item_straw: { name: "秸稈", icon: "🪵" },
  item_water: { name: "水", icon: "💧" },
  item_flour: { name: "麵粉", icon: "🥣" },
  item_feed: { name: "飼料", icon: "🧺" },
  item_dough: { name: "麵團", icon: "⚪" },
  item_bread: { name: "麵包", icon: "🍞" },
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

export const BUILDING_ICON: Record<string, string> = {
  bdef_field: "🌾",
  bdef_silo: "🏚️",
  bdef_mill: "⚙️",
  bdef_oven: "🔥",
};

export function itemLabel(id: string) {
  return ITEM_META[id]?.name ?? id.replace(/^item_/, "").replace(/_/g, " ");
}
