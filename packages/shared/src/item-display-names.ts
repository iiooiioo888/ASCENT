/** D12：後端資源不足文案用中文物品名（與 web ITEM_META 對齊）。 */
export const ITEM_DISPLAY_NAME: Record<string, string> = {
  item_seed_wheat: "小麥種子",
  item_wheat: "小麥",
  item_straw: "秸稈",
  item_water: "水",
  item_flour: "麵粉",
  item_feed: "飼料",
  item_dough: "麵團",
  item_bread: "麵包",
  item_egg: "雞蛋",
  item_milk: "牛奶",
  item_cake: "蛋糕",
  item_seed_cotton: "棉花種子",
  item_cotton: "棉花",
  item_cloth: "布",
  item_gold: "金幣",
  item_oil: "石油",
};

export function itemDisplayName(itemId: string): string {
  return ITEM_DISPLAY_NAME[itemId] ?? itemId.replace(/^item_/, "").replace(/_/g, " ");
}

export function insufficientMaterialMessage(itemId: string): string {
  return `資源不足：${itemDisplayName(itemId)}`;
}
