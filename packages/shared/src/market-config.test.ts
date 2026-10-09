import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKET_PRICES,
  ITEM_GOLD_ID,
  ITEM_SETTLEMENT_CURRENCY_ID,
  STARTING_COPPER,
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

  it("開局銅錠已拍板為 50000", () => {
    expect(STARTING_COPPER).toBe(50_000);
    expect(ITEM_SETTLEMENT_CURRENCY_ID).toBe("item_copper_ingot");
  });

  it("預設價目與規格佔位一致", () => {
    expect(DEFAULT_MARKET_PRICES.sell.item_bread).toBe(8);
    expect(DEFAULT_MARKET_PRICES.buy.item_seed_wheat).toBe(3);
    expect(DEFAULT_MARKET_PRICES.buy.item_water).toBe(1);
  });

  it("CURR-BARTER：MK 賣礦／錠價（整數銅錠，無買礦）", () => {
    expect(DEFAULT_MARKET_PRICES.sell.item_copper_ore).toBe(2);
    expect(DEFAULT_MARKET_PRICES.sell.item_silver_ore).toBe(5);
    expect(DEFAULT_MARKET_PRICES.sell.item_gold_ore).toBe(12);
    expect(DEFAULT_MARKET_PRICES.sell.item_copper_ingot).toBe(4);
    expect(DEFAULT_MARKET_PRICES.sell.item_silver_ingot).toBe(12);
    expect(DEFAULT_MARKET_PRICES.sell.item_gold_ingot).toBe(25);
    expect(DEFAULT_MARKET_PRICES.buy.item_copper_ore).toBeUndefined();
    expect(DEFAULT_MARKET_PRICES.buy.item_silver_ore).toBeUndefined();
    expect(DEFAULT_MARKET_PRICES.buy.item_gold_ore).toBeUndefined();
  });

  it("不可交易 item_gold（舊金錢物品）", () => {
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
