/** TODO(product): 開局金幣、價目與可交易清單皆為佔位，產品定案後可調。 */
export const ITEM_GOLD_ID = "item_gold";
export const ITEM_CURRENCY_TYPE_ID = "it_currency";

/** TODO(product): 新手是否給緩衝金幣。 */
export const STARTING_GOLD = 0;

export type MarketPriceBook = {
  sell: Record<string, number>;
  buy: Record<string, number>;
};

/** TODO(product): 平衡未定；伺服器權威，DB 可覆寫。 */
export const DEFAULT_MARKET_PRICES: MarketPriceBook = {
  sell: {
    item_bread: 8,
    item_feed: 3,
    item_flour: 4,
    item_dough: 5,
    item_wheat: 2,
    item_straw: 1,
  },
  buy: {
    item_seed_wheat: 3,
    item_water: 1,
  },
};

function isPositiveInt(n: number): boolean {
  return Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

function isValidUnitPrice(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

/** 合併 DB JSON 與預設價目；非法項忽略。 */
export function marketPricesFromDb(raw: unknown): MarketPriceBook {
  const sell: Record<string, number> = { ...DEFAULT_MARKET_PRICES.sell };
  const buy: Record<string, number> = { ...DEFAULT_MARKET_PRICES.buy };
  if (!raw || typeof raw !== "object") return { sell, buy };
  const obj = raw as { sell?: Record<string, unknown>; buy?: Record<string, unknown> };
  if (obj.sell && typeof obj.sell === "object") {
    for (const [id, price] of Object.entries(obj.sell)) {
      if (isValidUnitPrice(price)) sell[id] = price;
    }
  }
  if (obj.buy && typeof obj.buy === "object") {
    for (const [id, price] of Object.entries(obj.buy)) {
      if (isValidUnitPrice(price)) buy[id] = price;
    }
  }
  return { sell, buy };
}

export function parseTradeQuantity(quantity: unknown): number | null {
  const n = typeof quantity === "string" ? Number(quantity) : quantity;
  if (typeof n !== "number" || !isPositiveInt(n)) return null;
  return n;
}

export type MarketTradeSide = "sell" | "buy";

export function resolveMarketUnitPrice(
  side: MarketTradeSide,
  itemId: string,
  book: MarketPriceBook,
): number | null {
  if (itemId === ITEM_GOLD_ID) return null;
  const table = side === "sell" ? book.sell : book.buy;
  const price = table[itemId];
  return isValidUnitPrice(price) ? price : null;
}
