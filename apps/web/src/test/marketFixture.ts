import { DEFAULT_MARKET_PRICES } from "@ascent/shared";
import type { MarketSnapshot } from "../market";

/** Minimal market payload for App integration tests. */
export function defaultMarketSnapshotForTests(overrides?: Partial<MarketSnapshot>): MarketSnapshot {
  const holdings: Record<string, number> = { item_gold: 0 };
  for (const id of Object.keys(DEFAULT_MARKET_PRICES.sell)) holdings[id] = 0;
  for (const id of Object.keys(DEFAULT_MARKET_PRICES.buy)) holdings[id] = 0;
  return {
    gold: 0,
    prices: DEFAULT_MARKET_PRICES,
    holdings,
    ...overrides,
  };
}

export function withMarketApiRoute(
  handler: (path: string, init?: RequestInit) => Promise<unknown>,
): (path: string, init?: RequestInit) => Promise<unknown> {
  return async (path, init) => {
    if (path === "/api/v1/market") {
      return defaultMarketSnapshotForTests();
    }
    return handler(path, init);
  };
}
