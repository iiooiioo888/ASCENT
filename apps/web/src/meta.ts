import { METHOD_NAME as SHARED_METHOD_NAMES } from "@ascent/shared";

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
};

/** P3-5: method display names from shared catalog (avoid drift). */
export const METHOD_NAME: Record<string, string> = { ...SHARED_METHOD_NAMES };

export const BUILDING_ICON: Record<string, string> = {
  bdef_field: "🌾",
  bdef_silo: "🏚️",
  bdef_mill: "⚙️",
  bdef_oven: "🔥",
};

export function itemLabel(id: string) {
  return ITEM_META[id]?.name ?? id.replace(/^item_/, "").replace(/_/g, " ");
}
