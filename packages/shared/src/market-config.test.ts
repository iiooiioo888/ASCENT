import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKET_PRICES,
  ITEM_GOLD_ID,
  marketPricesFromDb,
  parseTradeQuantity,
  resolveMarketUnitPrice,
} from "./market-config";

describe("market-config", () => {
  it("parseTradeQuantity 拒絕非正整數", () => {
    expect(parseTradeQuantity(0)).toBeNull();
    expect(parseTradeQuantity(-1)).toBeNull();
    expect(parseTradeQuantity(1.5)).toBeNull();
    expect(parseTradeQuantity("2")).toBe(2);
    expect(parseTradeQuantity(3)).toBe(3);
  });

  it("預設價目與規格佔位一致", () => {
    expect(DEFAULT_MARKET_PRICES.sell.item_bread).toBe(8);
    expect(DEFAULT_MARKET_PRICES.buy.item_seed_wheat).toBe(3);
    expect(DEFAULT_MARKET_PRICES.buy.item_water).toBe(1);
  });

  it("不可交易金幣", () => {
    const book = marketPricesFromDb(null);
    expect(resolveMarketUnitPrice("sell", ITEM_GOLD_ID, book)).toBeNull();
    expect(resolveMarketUnitPrice("buy", ITEM_GOLD_ID, book)).toBeNull();
    expect(resolveMarketUnitPrice("sell", "item_unknown", book)).toBeNull();
  });

  it("DB 價目覆寫合法項", () => {
    const book = marketPricesFromDb({
      sell: { item_bread: 10, item_bread_bad: 0 },
      buy: { item_water: 2 },
    });
    expect(book.sell.item_bread).toBe(10);
    expect(book.buy.item_water).toBe(2);
    expect(book.sell.item_bread_bad).toBeUndefined();
  });
});
