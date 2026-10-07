import type { MarketPriceBook } from "./market-config";
import { resolveRetailBidAnchor, type RetailConfig, RETAIL_SKU_ID } from "./retail-config";

/** AFK-D6–D9：商行麵包貨架（SKU 鎖麵包）。 */
export const RETAIL_SHELF_MAX_QTY_PER_TICK = 3;

/** 事件／訊息通道文案預留（AFK-D9）。 */
export function formatRetailShelfSoldMessage(qty: number): string {
  return `貨架已售出 ×${qty}`;
}

export type RetailShelfConfig = {
  enabled: boolean;
  /** 玩家標價（整數金幣）；未設定時由 defaultShelfAskGold 推算。 */
  askGold: number | null;
};

export type RetailShelfPublicState = {
  enabled: boolean;
  ask: number;
  todayRevenueGold: number;
  skuId: typeof RETAIL_SKU_ID;
};

/** 預設 ask = max(1, floor(MK 麵包現價))。 */
export function defaultShelfAskGold(book: MarketPriceBook, retailConfig: RetailConfig): number {
  const anchor = resolveRetailBidAnchor(book, retailConfig);
  return Math.max(1, Math.floor(anchor));
}

export function resolveShelfAskGold(
  storedAsk: number | null | undefined,
  book: MarketPriceBook,
  retailConfig: RetailConfig,
): number {
  if (typeof storedAsk === "number" && Number.isInteger(storedAsk) && storedAsk >= 1) {
    return storedAsk;
  }
  return defaultShelfAskGold(book, retailConfig);
}

export function gameDayIndex(displayGameTimeSec: number, gameDayGameSec: number): number {
  const dayLen = Math.max(1, Math.floor(gameDayGameSec));
  return Math.floor(Math.max(0, displayGameTimeSec) / dayLen);
}

/** 單 tick 售出 1～min(3, 庫存)。 */
export function rollShelfSaleQty(stock: number, rnd: () => number = Math.random): number {
  const cap = Math.min(RETAIL_SHELF_MAX_QTY_PER_TICK, Math.floor(stock));
  if (cap < 1) return 0;
  return 1 + Math.floor(rnd() * cap);
}

export function shelfTicksElapsed(
  lastTickRealMs: number,
  nowRealMs: number,
  tickIntervalRealMs: number,
  maxOfflineRealSec: number,
): number {
  const interval = Math.max(1, Math.floor(tickIntervalRealMs));
  const rawSec = Math.max(0, (nowRealMs - lastTickRealMs) / 1000);
  const cappedSec = Math.min(rawSec, Math.max(0, maxOfflineRealSec));
  return Math.floor((cappedSec * 1000) / interval);
}
