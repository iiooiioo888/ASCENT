import { EQUITY_CONFIG, ITEM_GOLD_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InventoryService } from "../inventory/inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { EquityMarketService } from "./equity-market.service";
import { MarketService } from "./market.service";

describe("莊股（整合）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;
  let equity: EquityMarketService;
  let market: MarketService;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
    equity = new EquityMarketService(prisma, inventory);
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

  async function setGold(quantity: number) {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: "player_local", itemId: ITEM_GOLD_ID } },
      update: { quantity },
      create: { playerId: "player_local", itemId: ITEM_GOLD_ID, quantity },
    });
  }

  it("GET 回傳三檔 tickers 與 seed priceHistory", async () => {
    const res = await equity.getEquityMarket();
    expect(res.tickers).toHaveLength(3);
    expect(res.holdings.eq_wheat_coop).toBe(0);
    expect(res.feeRate).toBe(0.02);
    const wheat = res.tickers.find((t) => t.id === "eq_wheat_coop")!;
    expect(wheat.currentPrice).toBe(10);
    expect(wheat.priceHistory.length).toBeGreaterThanOrEqual(1);
    expect(wheat.priceHistory[0].price).toBe(10);
  });

  it("買入扣金、加持倉、價格上升並 append history", async () => {
    await setGold(1000);
    const before = await equity.getEquityMarket();
    const priceBefore = before.tickers.find((t) => t.id === "eq_wheat_coop")!.currentPrice;
    const histLenBefore = before.tickers.find((t) => t.id === "eq_wheat_coop")!.priceHistory.length;

    const trade = await equity.buy("eq_wheat_coop", 2);
    expect(trade.side).toBe("buy");
    expect(trade.holdings.eq_wheat_coop).toBe(2);
    expect(trade.newPrice).toBeGreaterThanOrEqual(priceBefore);

    const after = await equity.getEquityMarket();
    expect(after.holdings.eq_wheat_coop).toBe(2);
    const hist = after.tickers.find((t) => t.id === "eq_wheat_coop")!.priceHistory;
    expect(hist.length).toBe(histLenBefore + 1);
    for (let i = 1; i < hist.length; i++) {
      expect(hist[i].t).toBeGreaterThanOrEqual(hist[i - 1].t);
    }
  });

  it("賣出加金、減持倉、價格下降", async () => {
    await setGold(1000);
    await equity.buy("eq_mill_share", 5);
    const mid = await equity.getEquityMarket();
    const priceBefore = mid.tickers.find((t) => t.id === "eq_mill_share")!.currentPrice;
    await equity.sell("eq_mill_share", 1);
    const after = await equity.getEquityMarket();
    expect(after.holdings.eq_mill_share).toBe(4);
    expect(after.tickers.find((t) => t.id === "eq_mill_share")!.currentPrice).toBeLessThanOrEqual(priceBefore);
  });

  it("超單筆上限與持倉上限", async () => {
    await setGold(100_000);
    await expect(equity.buy("eq_wheat_coop", 11)).rejects.toMatchObject({
      response: { message: "超過單筆上限", statusCode: 400 },
    });
    for (let i = 0; i < 5; i++) {
      await equity.buy("eq_wheat_coop", 10);
    }
    await expect(equity.buy("eq_wheat_coop", 1)).rejects.toMatchObject({
      response: { message: "已達持倉上限", statusCode: 400 },
    });
  });

  it("手續費過高拒賣", async () => {
    await setGold(1000);
    await equity.buy("eq_wheat_coop", 1);
    await prisma.equityTickerState.update({
      where: { equityId: "eq_wheat_coop" },
      data: { currentPrice: 1 },
    });
    await expect(equity.sell("eq_wheat_coop", 1)).rejects.toMatchObject({
      response: { message: "手續費過高", statusCode: 400 },
    });
  });

  it("未知 equityId", async () => {
    await expect(equity.buy("eq_unknown", 1)).rejects.toMatchObject({
      response: { message: "不可交易：eq_unknown", statusCode: 400 },
    });
  });

  it("priceHistory ring 不超過 64", async () => {
    await setGold(500_000);
    const max = EQUITY_CONFIG.priceHistorySize;
    const seedLen = (await equity.getEquityMarket()).tickers[0].priceHistory.length;
    const tradesNeeded = max - seedLen + 5;
    for (let i = 0; i < tradesNeeded; i++) {
      await equity.buy("eq_oven_share", 1);
      await equity.sell("eq_oven_share", 1);
    }
    const hist = (await equity.getEquityMarket()).tickers.find((t) => t.id === "eq_oven_share")!.priceHistory;
    expect(hist.length).toBeLessThanOrEqual(max);
  });

  it("MK 價目不受莊股影響", async () => {
    await setGold(1000);
    await equity.buy("eq_wheat_coop", 1);
    const mk = await market.getMarket();
    expect(mk.prices.sell.item_bread).toBe(8);
  });
});
