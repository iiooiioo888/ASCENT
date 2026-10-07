/**
 * Player-facing copy for the NPC market panel (MK-FE-1).
 * TODO(product): 價目、清單與文案待產品定案。
 */

export const MARKET_COPY = {
  title: "莊外商行",
  /** Shown on the trading-post building card badge (v1.2). */
  buildingStatus: "商行",
  tradeCta: "交易",
  closeTradeCta: "收起交易",
  subtitle: "固定收購 · 補給種子與水",
  sellTab: "賣出",
  buyTab: "買入",
  sellCta: "賣出",
  buyCta: "買入",
  emptySell: "尚無可賣貨物。先去田裡與爐灶生產吧。",
  needGold: "金幣不足",
  needStock: "無存貨",
  hint: "麵包與飼料可在此換金幣，再買種子與水。",
  genericError: "操作失敗，請重試",
  invalidQuantity: "數量無效",
  notTradable: "此物品不可交易",
  settlementConflict: "建築結算衝突，請重試",
  successSellTemplate: "已售出 {item}×{q}，＋🪙{n}",
  successBuyTemplate: "已購入 {item}×{q}，－🪙{n}",
} as const;

export function marketBalanceLabel(gold: number): string {
  return `金幣 ${gold}`;
}

export function successSell(item: string, q: string, n: string): string {
  return MARKET_COPY.successSellTemplate
    .replace("{item}", item)
    .replace("{q}", q)
    .replace("{n}", n);
}

export function successBuy(item: string, q: string, n: string): string {
  return MARKET_COPY.successBuyTemplate
    .replace("{item}", item)
    .replace("{q}", q)
    .replace("{n}", n);
}

/** HUD chip (§5.1). */
export function hudGoldChip(gold: number): string {
  return `🪙 ${gold}`;
}
