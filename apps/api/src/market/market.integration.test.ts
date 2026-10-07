import { ITEM_GOLD_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InventoryService } from "../inventory/inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { MarketService } from "./market.service";

describe("市集（整合）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;
  let market: MarketService;

  const tradingPostBuildingId = "pb_player_local_bdef_trading_post";

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
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

  it("種子後開局金幣為 10", async () => {
    const res = await market.getMarket();
    expect(res.gold).toBe(10);
  });

  it("GET 摘要回傳價目與金幣", async () => {
    await setQty(ITEM_GOLD_ID, 5);
    const res = await market.getMarket();
    expect(res.prices.sell.item_bread).toBe(8);
    expect(res.prices.buy.item_seed_wheat).toBe(3);
    expect(res.gold).toBe(5);
  });

  it("種子預放莊外商行", async () => {
    const building = await prisma.playerBuilding.findFirst({
      where: { playerId: "player_local", buildingDefId: "bdef_trading_post" },
    });
    expect(building).not.toBeNull();
    expect(building!.id).toBe(tradingPostBuildingId);
  });

  it("GET state 含一座莊外商行", async () => {
    const state = await inventory.state();
    const posts = state.buildings.filter((b) => b.buildingDefId === "bdef_trading_post");
    expect(posts).toHaveLength(1);
    expect(posts[0].buildingDef.code).toBe("trading_post");
  });

  it("莊外商行不可 start 生產方式", async () => {
    await expect(inventory.start(tradingPostBuildingId, "method_grow_wheat_default")).rejects.toMatchObject({
      response: { message: "此建築不能使用該方式", statusCode: 400 },
    });
  });

  it("賣出麵包增加金幣（扣運費後淨額）", async () => {
    await setQty("item_bread", 2);
    await setQty(ITEM_GOLD_ID, 0);
    const res = await market.sell("item_bread", 1);
    expect(res.goldDelta).toBe(7);
    expect(res.netGoldDelta).toBe(7);
    expect(res.transportFee).toBe(1);
    const gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: ITEM_GOLD_ID } },
    });
    expect(Number(gold?.quantity)).toBe(7);
  });

  it("買入種子扣金幣", async () => {
    await setQty(ITEM_GOLD_ID, 10);
    await market.buy("item_seed_wheat", 2);
    const gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: ITEM_GOLD_ID } },
    });
    expect(Number(gold?.quantity)).toBe(4);
  });

  it("庫存不足", async () => {
    await setQty("item_bread", 0);
    await expect(market.sell("item_bread", 1)).rejects.toMatchObject({
      response: { message: "資源不足：item_bread", statusCode: 400 },
    });
  });

  it("金幣不足", async () => {
    await setQty(ITEM_GOLD_ID, 0);
    await expect(market.buy("item_water", 1)).rejects.toMatchObject({
      response: { message: "金幣不足", statusCode: 400 },
    });
  });

  it("禁止賣金幣", async () => {
    await setQty(ITEM_GOLD_ID, 5);
    await expect(market.sell(ITEM_GOLD_ID, 1)).rejects.toMatchObject({
      response: { message: `不可交易：${ITEM_GOLD_ID}`, statusCode: 400 },
    });
  });

  it("連續兩次賣出唔會雙倍扣（僅持有 1）", async () => {
    await setQty("item_bread", 1);
    await setQty(ITEM_GOLD_ID, 0);
    await market.sell("item_bread", 1);
    await expect(market.sell("item_bread", 1)).rejects.toMatchObject({
      response: { statusCode: 400 },
    });
    const gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: ITEM_GOLD_ID } },
    });
    expect(Number(gold?.quantity)).toBe(7);
  });
});
