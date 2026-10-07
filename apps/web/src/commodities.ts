import { api, ApiError } from "./api";

export type PriceHistoryPoint = { t: number; price: number };

export type CommodityListing = {
  id: string;
  name: string;
  itemId: string;
  basePrice: number;
  enabled: boolean;
  price: number;
  change: number;
  priceHistory: PriceHistoryPoint[];
  holding: number;
};

export type CommoditiesSnapshot = {
  gold: number;
  feeRate: number;
  minFeeGold: number;
  maxQtyPerOrder: number;
  listings: CommodityListing[];
};

export function commodityFee(notional: number, feeRate: number, minFeeGold: number): number {
  return Math.max(minFeeGold, Math.round(notional * feeRate));
}

export function commodityBuyTotal(
  unitPrice: number,
  quantity: number,
  feeRate: number,
  minFeeGold: number,
): number {
  const notional = unitPrice * quantity;
  return notional + commodityFee(notional, feeRate, minFeeGold);
}

export function commoditySellNet(
  unitPrice: number,
  quantity: number,
  feeRate: number,
  minFeeGold: number,
): number {
  const notional = unitPrice * quantity;
  return notional - commodityFee(notional, feeRate, minFeeGold);
}

export function commoditySellFeeTooHigh(
  unitPrice: number,
  quantity: number,
  feeRate: number,
  minFeeGold: number,
): boolean {
  const notional = unitPrice * quantity;
  return notional <= commodityFee(notional, feeRate, minFeeGold);
}

export function maxCommodityBuyQty(
  unitPrice: number,
  gold: number,
  maxQtyPerOrder: number,
  feeRate: number,
  minFeeGold: number,
): number {
  let max = 0;
  const cap = Math.max(0, Math.floor(maxQtyPerOrder));
  for (let q = 1; q <= cap; q++) {
    if (commodityBuyTotal(unitPrice, q, feeRate, minFeeGold) <= gold) {
      max = q;
    }
  }
  return max;
}

export async function fetchCommodities(): Promise<CommoditiesSnapshot> {
  return api<CommoditiesSnapshot>("/api/v1/market/commodities");
}

/** Returns null when the commodities API is absent (404/501) — hide the tab. */
export async function fetchCommoditiesOptional(): Promise<CommoditiesSnapshot | null> {
  try {
    return await fetchCommodities();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return null;
    }
    throw e;
  }
}

export function enabledCommodityListings(snapshot: CommoditiesSnapshot): CommodityListing[] {
  return snapshot.listings.filter((l) => l.enabled);
}

export type CommodityTradeResult = {
  side: "buy" | "sell";
  commodityId: string;
  quantity: number;
  unitPrice: number;
  feeGold: number;
  goldDelta: number;
  netGoldDelta?: number;
};

export async function postCommodityBuy(commodityId: string, quantity: number): Promise<CommodityTradeResult> {
  return api<CommodityTradeResult>("/api/v1/market/commodities/buy", {
    method: "POST",
    body: JSON.stringify({ commodityId, quantity }),
  });
}

export async function postCommoditySell(commodityId: string, quantity: number): Promise<CommodityTradeResult> {
  return api<CommodityTradeResult>("/api/v1/market/commodities/sell", {
    method: "POST",
    body: JSON.stringify({ commodityId, quantity }),
  });
}
