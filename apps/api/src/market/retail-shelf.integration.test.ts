import { ITEM_SETTLEMENT_CURRENCY_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InventoryService } from "../inventory/inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { RetailMarketService } from "./retail-market.service";
import { RetailShelfService } from "./retail-shelf.service";

describe("AFK-BE-2 商行貨架", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;
  let shelf: RetailShelfService;
  let retail: RetailMarketService;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
    shelf = new RetailShelfService(prisma, sim, inventory);
    retail = new RetailMarketService(prisma, sim, inventory);
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

  it("GET 預設 ask 跟市 MK×0.95", async () => {
    const res = await shelf.getShelf();
    expect(res.enabled).toBe(false);
    expect(res.followMarket).toBe(true);
    expect(res.ask).toBe(7);
    expect(res.todayRevenueGold).toBe(0);
    expect(res.skuId).toBe("item_bread");
  });

  it("PATCH enabled／ask 持久化並關跟市", async () => {
    const patched = await shelf.patchShelf({ enabled: true, ask: 12 });
    expect(patched.enabled).toBe(true);
    expect(patched.followMarket).toBe(false);
    expect(patched.ask).toBe(12);

    const again = await shelf.getShelf();
    expect(again.ask).toBe(12);
    expect(again.followMarket).toBe(false);

    const row = await prisma.playerRetailState.findUnique({ where: { playerId: "player_local" } });
    expect(row?.shelfFollowMarket).toBe(false);
  });

  it("PATCH followMarket 再開跟市", async () => {
    await shelf.patchShelf({ enabled: true, ask: 99 });
    const on = await shelf.patchShelf({ followMarket: true });
    expect(on.followMarket).toBe(true);
    expect(on.ask).toBe(7);
  });

  it("tick 出貨加金、扣麵包、累加今日收入；busy 不變", async () => {
    await shelf.patchShelf({ enabled: true, ask: 5 });
    await setQty("item_bread", 10);
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 0);
    const busyBefore = (await prisma.player.findUnique({ where: { id: "player_local" } }))!.workforceBusy;

    const base = new Date("2020-01-01T00:00:00.000Z");
    await prisma.playerRetailState.update({
      where: { playerId: "player_local" },
      data: { shelfLastTickAt: base },
    });

    const rnd = () => 0;
    await shelf.runShelfSettlementForTest(new Date(base.getTime() + 5000), rnd);

    const bread = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_bread" } },
    });
    expect(Number(bread?.quantity)).toBe(9);

    const gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: ITEM_SETTLEMENT_CURRENCY_ID } },
    });
    expect(Number(gold?.quantity)).toBe(5);

    const retailRow = await prisma.playerRetailState.findUnique({ where: { playerId: "player_local" } });
    expect(retailRow?.shelfTodayRevenueGold).toBe(5);

    const busyAfter = (await prisma.player.findUnique({ where: { id: "player_local" } }))!.workforceBusy;
    expect(busyAfter).toBe(busyBefore);
  });

  it("關閉貨架不出貨", async () => {
    await shelf.patchShelf({ enabled: false, ask: 5 });
    await setQty("item_bread", 5);
    const base = new Date("2020-01-01T00:00:00.000Z");
    await prisma.playerRetailState.update({
      where: { playerId: "player_local" },
      data: { shelfLastTickAt: base },
    });
    await shelf.runShelfSettlementForTest(new Date(base.getTime() + 5000), () => 0);
    const bread = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_bread" } },
    });
    expect(Number(bread?.quantity)).toBe(5);
  });

  it("客單流程仍可用", async () => {
    await shelf.patchShelf({ enabled: true, ask: 99 });
    const res = await retail.getRetail();
    const offer = res.offers[0];
    await setQty("item_bread", offer.qty);
    const trade = await retail.acceptOffer(offer.offerId);
    expect(trade.goldDelta).toBeGreaterThan(0);
  });

  it("GET state 含 retailShelf", async () => {
    await shelf.patchShelf({ enabled: true, ask: 7 });
    const state = await inventory.state();
    expect(state.retailShelf).toEqual({
      enabled: true,
      followMarket: false,
      ask: 7,
      todayRevenueGold: 0,
    });
  });
});
