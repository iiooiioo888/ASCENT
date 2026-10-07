import { DEFAULT_MARKET_PRICES } from "./market-config";
import type { MarketPriceBook } from "./market-config";

/** RT-D1–D12 LOCKED：零售客單常數（min-playable）。 */
export const RETAIL_SKU_ID = "item_bread";

export type RetailConfig = {
  /** 同時可見客單槽位（1–3，RT-D3）。 */
  slotCount: number;
  /** MK 麵包賣價錨點 fallback（RT-D12）。 */
  bidAnchorGold: number;
  /** 單價浮動比例（例 0.2＝±20%）。 */
  bidVarianceRatio: number;
  offerTtlSecMin: number;
  offerTtlSecMax: number;
  qtyMin: number;
  qtyMax: number;
};

export const DEFAULT_RETAIL_CONFIG: RetailConfig = {
  slotCount: 3,
  bidAnchorGold: DEFAULT_MARKET_PRICES.sell.item_bread,
  bidVarianceRatio: 0.2,
  offerTtlSecMin: 60,
  offerTtlSecMax: 180,
  qtyMin: 1,
  qtyMax: 4,
};

export type RetailOffer = {
  offerId: string;
  skuId: typeof RETAIL_SKU_ID;
  qty: number;
  bidGold: number;
  expiresAt?: number;
  buyerLabel?: string;
};

export const RETAIL_OPS_HINT = {
  busy: 0,
  wage: 0,
  haul: 0,
  fee: 0,
} as const;

export const RETAIL_BUYER_LABELS = [
  "路過村民",
  "城里買家",
  "赶集旅人",
  "邻家掌柜",
  "赶路人",
  "庄头食客",
] as const;

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function pickPositiveNumber(value: unknown, fallback: number, min = 1): number {
  return typeof value === "number" && Number.isFinite(value) && value >= min ? value : fallback;
}

function pickRatio(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) return fallback;
  return value;
}

/** 合併 DB JSON 與預設；非法項回退。 */
export function retailConfigFromDb(raw: unknown): RetailConfig {
  const base = { ...DEFAULT_RETAIL_CONFIG };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<RetailConfig>;
  const slotCount = clampInt(pickPositiveNumber(obj.slotCount, base.slotCount), 1, 3);
  const offerTtlSecMin = pickPositiveNumber(obj.offerTtlSecMin, base.offerTtlSecMin, 1);
  const offerTtlSecMax = Math.max(
    offerTtlSecMin,
    pickPositiveNumber(obj.offerTtlSecMax, base.offerTtlSecMax, offerTtlSecMin),
  );
  const qtyMin = pickPositiveNumber(obj.qtyMin, base.qtyMin);
  const qtyMax = Math.max(qtyMin, pickPositiveNumber(obj.qtyMax, base.qtyMax, qtyMin));
  return {
    slotCount,
    bidAnchorGold: pickPositiveNumber(obj.bidAnchorGold, base.bidAnchorGold),
    bidVarianceRatio: pickRatio(obj.bidVarianceRatio, base.bidVarianceRatio),
    offerTtlSecMin,
    offerTtlSecMax,
    qtyMin,
    qtyMax,
  };
}

/** 錨 MK 麵包賣價（價目表優先，否則 config fallback）。 */
export function resolveRetailBidAnchor(book: MarketPriceBook, config: RetailConfig): number {
  const fromBook = book.sell[RETAIL_SKU_ID];
  if (typeof fromBook === "number" && Number.isFinite(fromBook) && fromBook > 0 && Number.isInteger(fromBook)) {
    return fromBook;
  }
  return config.bidAnchorGold;
}

export function rollBidGold(anchorGold: number, varianceRatio: number, rnd: () => number): number {
  const delta = (rnd() * 2 - 1) * varianceRatio;
  const raw = anchorGold * (1 + delta);
  return Math.max(1, Math.round(raw));
}

export function rollOfferQty(config: RetailConfig, rnd: () => number): number {
  const span = config.qtyMax - config.qtyMin + 1;
  return config.qtyMin + Math.floor(rnd() * span);
}

export function rollOfferTtlMs(config: RetailConfig, rnd: () => number): number {
  const minMs = config.offerTtlSecMin * 1000;
  const maxMs = config.offerTtlSecMax * 1000;
  return minMs + Math.floor(rnd() * (maxMs - minMs + 1));
}

export function pickBuyerLabel(rnd: () => number): string {
  const idx = Math.floor(rnd() * RETAIL_BUYER_LABELS.length);
  return RETAIL_BUYER_LABELS[idx] ?? RETAIL_BUYER_LABELS[0];
}

export function isRetailOfferExpired(expiresAt: number | undefined, nowMs: number): boolean {
  if (expiresAt === undefined) return false;
  return nowMs >= expiresAt;
}

export function retailOfferToDto(offer: RetailOffer): RetailOffer {
  const dto: RetailOffer = {
    offerId: offer.offerId,
    skuId: RETAIL_SKU_ID,
    qty: offer.qty,
    bidGold: offer.bidGold,
  };
  if (offer.expiresAt !== undefined) dto.expiresAt = offer.expiresAt;
  if (offer.buyerLabel) dto.buyerLabel = offer.buyerLabel;
  return dto;
}
