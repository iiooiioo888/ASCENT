/** TODO(product): 開局銅錠、價目與可交易清單皆為佔位，產品定案後可調。 */
export const ITEM_GOLD_ID = "item_gold";
export const ITEM_COPPER_INGOT_ID = "item_copper_ingot";
/** Phase B（CURR-BARTER）：結算扣／加銅錠；價目整數＝銅錠數量（1 舊金錢＝1 銅錠）。 */
export const ITEM_SETTLEMENT_CURRENCY_ID = ITEM_COPPER_INGOT_ID;
export const SETTLEMENT_INSUFFICIENT_MESSAGE = "銅錠不足";
export const ITEM_CURRENCY_TYPE_ID = "it_currency";

/** 已拍板：開局 10 銅錠（原金錢餘額 1:1 語意）。 */
export const STARTING_COPPER_INGOT = 10;
/** @deprecated 使用 {@link STARTING_COPPER_INGOT} */
export const STARTING_GOLD = STARTING_COPPER_INGOT;

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
    item_egg: 3,
    item_milk: 4,
    item_cake: 28,
    item_cotton: 2,
    item_cloth: 12,
    item_ore: 2,
    item_iron: 15,
    item_iron_ingot: 6,
    item_copper_ore: 2,
    item_silver_ore: 5,
    item_gold_ore: 12,
    item_copper_ingot: 4,
    item_silver_ingot: 12,
    item_gold_ingot: 25,
    item_steel: 14,
    item_brick: 3,
    item_glass: 5,
    item_plank: 3,
    item_charcoal: 3,
    item_coke: 4,
    item_nails: 2,
    item_tools: 12,
    item_fertilizer: 10,
    item_machine: 28,
    item_engine: 36,
  },
  buy: {
    item_seed_wheat: 3,
    item_seed_cotton: 3,
    item_water: 1,
    item_coal: 2,
    item_iron_ore: 2,
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
