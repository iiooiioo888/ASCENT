export const ITEM_OIL_ID = "item_oil";

export type CommodityListingConfig = {
  id: string;
  name: string;
  itemId: string;
  basePrice: number;
  enabled: boolean;
};

export type CommoditiesConfig = {
  feeRate: number;
  minFeeGold: number;
  maxQtyPerOrder: number;
  priceHistorySize: number;
  priceBand: { floorRatio: number; ceilRatio: number };
  pressureK: number;
  liquidity: { mode: "unlimited" };
  listings: readonly CommodityListingConfig[];
};

/** OB-D1–D12 LOCKED defaults（tech-spec v0.1）。 */
export const COMMODITIES_CONFIG: CommoditiesConfig = {
  feeRate: 0.01,
  minFeeGold: 1,
  maxQtyPerOrder: 20,
  priceHistorySize: 64,
  priceBand: { floorRatio: 0.5, ceilRatio: 1.5 },
  pressureK: 0.15,
  liquidity: { mode: "unlimited" },
  listings: [
    { id: "oil", name: "石油", itemId: ITEM_OIL_ID, basePrice: 15, enabled: true },
    { id: "grain", name: "糧", itemId: "item_grain", basePrice: 8, enabled: false },
    { id: "ore", name: "礦", itemId: "item_ore", basePrice: 12, enabled: false },
  ],
};

export type PriceHistoryPoint = { t: number; price: number };

export function findCommodityListing(commodityId: string): CommodityListingConfig | undefined {
  return COMMODITIES_CONFIG.listings.find((l) => l.id === commodityId);
}

export function enabledCommodityListings(): CommodityListingConfig[] {
  return COMMODITIES_CONFIG.listings.filter((l) => l.enabled);
}

export function computeCommodityUnitPrice(
  basePrice: number,
  netPressureVolume: number,
  config: Pick<CommoditiesConfig, "pressureK" | "priceBand"> = COMMODITIES_CONFIG,
): number {
  const floor = basePrice * config.priceBand.floorRatio;
  const ceil = basePrice * config.priceBand.ceilRatio;
  const raw = basePrice + config.pressureK * netPressureVolume;
  return Math.round(Math.min(ceil, Math.max(floor, raw)));
}

export function computeCommodityFee(
  notional: number,
  config: Pick<CommoditiesConfig, "feeRate" | "minFeeGold"> = COMMODITIES_CONFIG,
): number {
  return Math.max(config.minFeeGold, Math.round(notional * config.feeRate));
}

/** 賣出：成交額不足以覆蓋手續費時拒絕（OB-D4）。 */
export function isCommoditySellBlockedByFee(
  notional: number,
  config: Pick<CommoditiesConfig, "feeRate" | "minFeeGold"> = COMMODITIES_CONFIG,
): boolean {
  const fee = computeCommodityFee(notional, config);
  return notional <= fee;
}

export function appendPriceHistory(
  history: PriceHistoryPoint[],
  price: number,
  maxSize: number = COMMODITIES_CONFIG.priceHistorySize,
  nowMs: number = Date.now(),
): PriceHistoryPoint[] {
  const next = [...history, { t: nowMs, price }];
  if (next.length <= maxSize) return next;
  return next.slice(next.length - maxSize);
}

export function parsePriceHistory(raw: unknown): PriceHistoryPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: PriceHistoryPoint[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const t = (entry as { t?: unknown }).t;
    const price = (entry as { price?: unknown }).price;
    if (typeof t !== "number" || !Number.isFinite(t)) continue;
    if (typeof price !== "number" || !Number.isFinite(price)) continue;
    out.push({ t, price: Math.round(price) });
  }
  return out;
}

export function initialPriceHistory(basePrice: number, nowMs: number = Date.now()): PriceHistoryPoint[] {
  return [{ t: nowMs, price: basePrice }];
}
