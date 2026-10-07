/** 商行「貨架」tab 文案（AFK-FE-2）。 */
export const RETAIL_SHELF_COPY = {
  tab: "貨架",
  subtitle: "麵包自動上架 · 離線亦會售出",
  hint: "貨架＝標價後自動賣麵包；即時接客請用「零售」tab。",
  loading: "載入貨架…",
  skuLabel: "麵包",
  enabledLabel: "開啟貨架",
  enabledOn: "已開啟",
  enabledOff: "已關閉",
  askLabel: "標價（金幣／個）",
  askCta: "套用標價",
  askInvalid: "標價須為 ≥1 的整數",
  todayRevenue: (n: number) => `今日貨架收入 🪙${n}`,
  pending: "處理中…",
  genericError: "貨架設定失敗，請稍後再試。",
  successEnabled: (on: boolean) => (on ? "已開啟貨架" : "已關閉貨架"),
  successAsk: (ask: number) => `標價已設為 🪙${ask}／個`,
} as const;
