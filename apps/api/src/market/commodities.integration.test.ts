import {
  COMMODITIES_CONFIG,
  DEFAULT_MARKET_PRICES,
  ITEM_SETTLEMENT_CURRENCY_ID,
  ITEM_OIL_ID,
} from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InventoryService } from "../inventory/inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { CommodityMarketService } from "./commodity-market.service";
import { MarketService } from "./market.service";

describe("大宗石油（整合）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;
  let commodities: CommodityMarketService;
  let market: MarketService;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
    commodities = new CommodityMarketService(prisma, inventory);
    market = new MarketService(prisma, sim, inventory);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await sim.refreshConfig();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    removeTestDatabase(databaseUrl);
  });

  async function setQty(itemId: string, quantity: number) {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: "player_local", itemId } },
      update: { quantity },
      create: { playerId: "player_local", itemId, quantity },
    });
  }

  it("GET 僅回 enabled 石油 listing", async () => {
    const res = await commodities.getCommodities();
    expect(res.listings).toHaveLength(1);
    expect(res.listings[0].commodityId).toBe("oil");
    expect(res.listings[0].price).toBe(15);
    expect(res.listings[0].holdings).toBe(0);
    expect(res.listings[0].priceHistory.length).toBeGreaterThanOrEqual(1);
    expect(res.maxQtyPerOrder).toBe(20);
  });

  it("買入石油扣金加庫存並推高價", async () => {
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 100);
    const before = await commodities.getCommodities();
    const priceBefore = before.listings[0].price;
    const res = await commodities.buyCommodity("oil", 5);
    expect(res.fee).toBeGreaterThanOrEqual(1);
    expect(res.goldDelta).toBeLessThan(0);
    const oil = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: ITEM_OIL_ID } },
    });
    expect(Number(oil?.quantity)).toBe(5);
    expect(res.listing.price).toBeGreaterThanOrEqual(priceBefore);
    expect(res.listing.priceHistory.length).toBeGreaterThan(before.listings[0].priceHistory.length);
  });

  it("賣出石油加金並壓低價", async () => {
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 0);
    await setQty(ITEM_OIL_ID, 3);
    const before = await commodities.getCommodities();
    const priceBefore = before.listings[0].price;
    const res = await commodities.sellCommodity("oil", 1);
    expect(res.goldDelta).toBeGreaterThan(0);
    expect(res.listing.price).toBeLessThanOrEqual(priceBefore);
  });

  it("銅錠不足", async () => {
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 0);
    await expect(commodities.buyCommodity("oil", 1)).rejects.toMatchObject({
      response: { message: "銅錠不足", statusCode: 400 },
    });
  });

  it("石油不足", async () => {
    await expect(commodities.sellCommodity("oil", 1)).rejects.toMatchObject({
      response: { message: `資源不足：${ITEM_OIL_ID}`, statusCode: 400 },
    });
  });

  it("超過單筆上限", async () => {
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 9999);
    await expect(commodities.buyCommodity("oil", 21)).rejects.toMatchObject({
      response: { message: "超過單筆上限", statusCode: 400 },
    });
  });

  it("disabled commodity 拒絕", async () => {
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 100);
    await expect(commodities.buyCommodity("grain", 1)).rejects.toMatchObject({
      response: { message: "不可交易：grain", statusCode: 400 },
    });
  });

  it("priceHistory 不超過 64", async () => {
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 50000);
    for (let i = 0; i < 70; i++) {
      await commodities.buyCommodity("oil", 1);
    }
    const res = await commodities.getCommodities();
    expect(res.listings[0].priceHistory.length).toBeLessThanOrEqual(COMMODITIES_CONFIG.priceHistorySize);
  });

  it("MK 價目仍不含石油", async () => {
    const mk = await market.getMarket();
    expect(mk.prices.sell[ITEM_OIL_ID]).toBeUndefined();
    expect(mk.prices.buy[ITEM_OIL_ID]).toBeUndefined();
    expect(DEFAULT_MARKET_PRICES.sell.item_oil).toBeUndefined();
  });

  it("MK 賣麵包仍可用", async () => {
    await setQty("item_bread", 1);
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 0);
    const res = await market.sell("item_bread", 1);
    expect(res.transportFee).toBe(1);
    expect(res.netGoldDelta).toBe(7);
    expect(res.goldDelta).toBe(7);
  });
});
