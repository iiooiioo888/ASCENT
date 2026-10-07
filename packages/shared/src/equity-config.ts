/** EQ-D1–D12 LOCKED：莊股市集常數（min-playable）。 */
export const EQUITY_CONFIG = {
  feeRate: 0.02,
  minFeeGold: 1,
  maxSharesPerEquity: 50,
  maxQtyPerOrder: 10,
  priceHistorySize: 64,
  priceBand: { floorRatio: 0.5, ceilRatio: 1.5 },
  pressureK: 0.2,
  listings: [
    { id: "eq_wheat_coop", name: "糧莊", basePrice: 10 },
    { id: "eq_mill_share", name: "磨坊股", basePrice: 12 },
    { id: "eq_oven_share", name: "爐灶股", basePrice: 14 },
  ],
} as const;

export type EquityListingId = (typeof EQUITY_CONFIG.listings)[number]["id"];

export type PriceHistoryPoint = { t: number; price: number };

export function isKnownEquityId(equityId: string): boolean {
  return EQUITY_CONFIG.listings.some((l) => l.id === equityId);
}

export function getEquityListing(equityId: string) {
  return EQUITY_CONFIG.listings.find((l) => l.id === equityId) ?? null;
}

export function clampEquityPrice(basePrice: number, netBuy: number): number {
  const { pressureK, priceBand } = EQUITY_CONFIG;
  const raw = basePrice + pressureK * netBuy;
  const floor = basePrice * priceBand.floorRatio;
  const ceil = basePrice * priceBand.ceilRatio;
  return Math.min(ceil, Math.max(floor, raw));
}

/** 手續費：max(minFeeGold, round(notional * feeRate)) */
export function computeEquityFee(notional: number): number {
  const { feeRate, minFeeGold } = EQUITY_CONFIG;
  return Math.max(minFeeGold, Math.round(notional * feeRate));
}

export function appendPriceHistoryRing(
  history: PriceHistoryPoint[],
  point: PriceHistoryPoint,
  maxSize = EQUITY_CONFIG.priceHistorySize,
): PriceHistoryPoint[] {
  const next = [...history, point];
  if (next.length <= maxSize) return next;
  return next.slice(next.length - maxSize);
}

export function seedPriceHistoryAtBase(basePrice: number, t = Date.now()): PriceHistoryPoint[] {
  return [{ t, price: basePrice }];
}
