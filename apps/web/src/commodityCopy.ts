/**
 * Player-facing copy for commodity bulk trading (OB-FE-1).
 */

export const COMMODITY_COPY = {
  tab: "大宗",
  title: "大宗行情",
  subtitle: "石油現貨 · 供需浮動（非真實商品市場）",
  hint: "石油為大宗現貨，價格隨買賣浮動；農產請到「賣出／買入」換固定價。",
  disclaimer: "遊戲內虛構商品市場，非真實交易。",
  price: "現價",
  change: "漲跌",
  hold: (n: number) => `持有 ${n}`,
  buyCta: "買入",
  sellCta: "賣出",
  previewBuy: (n: number) => `預估支付 🪙${n}（含手續費）`,
  previewSell: (n: number) => `預估實收 🪙${n}（已扣手續費）`,
  needGold: "金幣不足",
  needStock: "無存貨",
  qtyCap: "超過單筆上限",
  feeHigh: "手續費過高，無法賣出",
  liquidity: "今日進口額度已滿",
  empty: "尚未持有石油。可向商行買入進口油。",
  loading: "載入大宗行情…",
  genericError: "操作失敗，請重試",
  invalidQuantity: "數量無效",
  successBuy: (q: number, n: number) => `已買入石油×${q}，－🪙${n}`,
  successSell: (q: number, n: number) => `已賣出石油×${q}，＋🪙${n}`,
} as const;
