import { ApiError, api } from "./api";

export type PriceHistoryPoint = { t: number; price: number };

export type EquityTicker = {
  id: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  change: number;
  netBuyVolume?: number;
  priceHistory: PriceHistoryPoint[];
};

export type EquitySnapshot = {
  gold: number;
  feeRate: number;
  minFeeGold: number;
  maxSharesPerEquity: number;
  maxQtyPerOrder: number;
  holdings: Record<string, number>;
  tickers: EquityTicker[];
};

export type EquityTradeResult = {
  side: "buy" | "sell";
  equityId: string;
  quantity: number;
  unitPrice: number;
  notional: number;
  fee: number;
  goldDelta: number;
  newPrice?: number;
  priceHistory?: PriceHistoryPoint[];
  holdings?: Record<string, number>;
};

export async function fetchEquity(): Promise<EquitySnapshot | null> {
  try {
    return await api<EquitySnapshot>("/api/v1/market/equity");
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function postEquityBuy(equityId: string, quantity: number): Promise<EquityTradeResult> {
  return api<EquityTradeResult>("/api/v1/market/equity/buy", {
    method: "POST",
    body: JSON.stringify({ equityId, quantity }),
  });
}

export async function postEquitySell(equityId: string, quantity: number): Promise<EquityTradeResult> {
  return api<EquityTradeResult>("/api/v1/market/equity/sell", {
    method: "POST",
    body: JSON.stringify({ equityId, quantity }),
  });
}
