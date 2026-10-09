/**
 * Player-facing copy for the NPC market panel (MK-FE-1).
 * LOCKED MVP：價目聽 shared `DEFAULT_MARKET_PRICES`；本檔只作文案。
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
  emptySell: "先做出麵包或飼料再來換補給。",
  needGold: "銅錠不足",
  needStock: "無存貨",
  hint: "麵包與飼料可在此換銅錠，再買種子與水。",
  genericError: "操作失敗，請重試",
  invalidQuantity: "數量無效",
  notTradable: "此物品不可交易",
  settlementConflict: "建築結算衝突，請重試",
  successSellTemplate: "已售出 {item}×{q}，＋🟠{n}",
  successSellNetTemplate: "已售出 {item}×{q}，實收 🟠{n}",
  successSellNetWithFeeTemplate: "已售出 {item}×{q}，實收 🟠{n}（運費 🟠{fee}）",
  successBuyTemplate: "已購入 {item}×{q}，－🟠{n}",
} as const;

export function marketBalanceLabel(gold: number): string {
  return `銅錠 ${gold}`;
}

export function successSell(item: string, q: string, n: string): string {
  return MARKET_COPY.successSellTemplate
    .replace("{item}", item)
    .replace("{q}", q)
    .replace("{n}", n);
}

export function successSellNet(item: string, q: string, net: string, fee?: string): string {
  if (fee && fee !== "0") {
    return MARKET_COPY.successSellNetWithFeeTemplate
      .replace("{item}", item)
      .replace("{q}", q)
      .replace("{n}", net)
      .replace("{fee}", fee);
  }
  return MARKET_COPY.successSellNetTemplate
    .replace("{item}", item)
    .replace("{q}", q)
    .replace("{n}", net);
}

export function successBuy(item: string, q: string, n: string): string {
  return MARKET_COPY.successBuyTemplate
    .replace("{item}", item)
    .replace("{q}", q)
    .replace("{n}", n);
}

/** @deprecated 主 HUD 改三錠 chip；保留供舊測／相容。 */
export function hudGoldChip(gold: number): string {
  return `🟠 ${gold}`;
}
