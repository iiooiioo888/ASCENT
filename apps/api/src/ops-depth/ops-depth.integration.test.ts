import { ITEM_GOLD_ID, LOCAL_PLAYER_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InventoryService } from "../inventory/inventory.service";
import { MarketService } from "../market/market.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";

describe("經營深度運費（OD-BE-2 整合）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;
  let market: MarketService;

  const millId = `pb_${LOCAL_PLAYER_ID}_bdef_mill`;
  const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
  const wellId = `pb_${LOCAL_PLAYER_ID}_bdef_well`;
  const millMethodId = "method_mill_flour_default";
  const growMethodId = "method_grow_wheat_default";
  const drawMethodId = "method_draw_water_default";

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

  async function resetBuilding(id: string) {
    const b = await prisma.playerBuilding.findUnique({ where: { id } });
    if (!b) return;
    if (b.status === "ready") await inventory.collect(id);
    else if (b.status === "running") await inventory.stop(id);
  }

  async function setGold(qty: number) {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
      update: { quantity: qty },
      create: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID, quantity: qty },
    });
  }

  async function setQty(itemId: string, quantity: number) {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
      update: { quantity },
      create: { playerId: LOCAL_PLAYER_ID, itemId, quantity },
    });
  }

  it("T1：磨坊 start 扣 haul(1)＋wage(2)＋物料", async () => {
    await resetBuilding(millId);
    await setGold(20);
    await setQty("item_wheat", 10);

    await inventory.start(millId, millMethodId);

    const gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
    });
    expect(Number(gold?.quantity)).toBe(17);

    const wheat = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_wheat" } },
    });
    expect(Number(wheat?.quantity)).toBe(8);
  });

  it("T2：賣麵包×1 單價 8 運費 1 → 金幣 +7", async () => {
    await setQty("item_bread", 1);
    await setGold(0);
    const res = await market.sell("item_bread", 1);
    expect(res.transportFee).toBe(1);
    expect(res.netGoldDelta).toBe(7);
    expect(res.goldDelta).toBe(7);
    const gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
    });
    expect(Number(gold?.quantity)).toBe(7);
  });

  it("運費高於售價總額時拒賣", async () => {
    await prisma.gameConfig.update({
      where: { id: 1 },
      data: {
        marketPrices: { sell: { item_bread: 1 }, buy: {} },
        opsDepth: { sellTransport: { item_bread: 2 } },
      },
    });
    await sim.refreshConfig();
    await setQty("item_bread", 1);
    await expect(market.sell("item_bread", 1)).rejects.toMatchObject({
      response: { message: "運費過高", statusCode: 400 },
    });
  });

  it("田／井開工 haul=0，僅扣工資 1", async () => {
    await resetBuilding(fieldId);
    await resetBuilding(wellId);
    await setGold(5);

    await inventory.start(fieldId, growMethodId);
    let gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
    });
    expect(Number(gold?.quantity)).toBe(4);

    await inventory.stop(fieldId);
    await inventory.start(wellId, drawMethodId);
    gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
    });
    expect(Number(gold?.quantity)).toBe(3);
  });
});
