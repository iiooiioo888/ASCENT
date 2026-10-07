import type { MarketPriceBook } from "@ascent/shared";
import { api } from "./api";

export type MarketSnapshot = {
  gold: number;
  prices: MarketPriceBook;
  holdings: Record<string, number>;
};

export async function fetchMarket(): Promise<MarketSnapshot> {
  return api<MarketSnapshot>("/api/v1/market");
}

export type MarketSellResult = {
  side: "sell";
  itemId: string;
  quantity: number;
  unitPrice: number;
  goldDelta: number;
  transportFee?: number;
  netGoldDelta?: number;
};

export async function postMarketSell(itemId: string, quantity: number): Promise<MarketSellResult> {
  return api<MarketSellResult>("/api/v1/market/sell", {
    method: "POST",
    body: JSON.stringify({ itemId, quantity }),
  });
}

export async function postMarketBuy(itemId: string, quantity: number): Promise<void> {
  await api("/api/v1/market/buy", {
    method: "POST",
    body: JSON.stringify({ itemId, quantity }),
  });
}
