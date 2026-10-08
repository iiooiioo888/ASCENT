import { ITEM_SETTLEMENT_CURRENCY_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InventoryService } from "../inventory/inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { MarketService } from "./market.service";
import { RetailMarketService } from "./retail-market.service";

describe("零售市集（整合）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;
  let retail: RetailMarketService;
  let market: MarketService;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
    retail = new RetailMarketService(prisma, sim, inventory);
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

  it("首次 GET 生成 1–3 槽客單", async () => {
    const res = await retail.getRetail();
    expect(res.offers.length).toBeGreaterThanOrEqual(1);
    expect(res.offers.length).toBeLessThanOrEqual(3);
    expect(res.offers[0].skuId).toBe("item_bread");
    expect(res.opsHint).toEqual({ busy: 0, wage: 0, haul: 0, fee: 0 });
  });

  it("接單扣麵包加金幣、fee=0、busy 不變", async () => {
    const before = await retail.getRetail();
    const offer = before.offers[0];
    await setQty("item_bread", offer.qty + 2);
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 0);
    const busyBefore = (await prisma.player.findUnique({ where: { id: "player_local" } }))!.workforceBusy;

    const trade = await retail.acceptOffer(offer.offerId);
    expect(trade.goldDelta).toBe(offer.bidGold * offer.qty);
    expect(trade.feeGold).toBe(0);
    expect(trade.haulGold).toBe(0);

    const bread = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_bread" } },
    });
    expect(Number(bread?.quantity)).toBe(2);

    const gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: ITEM_SETTLEMENT_CURRENCY_ID } },
    });
    expect(Number(gold?.quantity)).toBe(offer.bidGold * offer.qty);

    const busyAfter = (await prisma.player.findUnique({ where: { id: "player_local" } }))!.workforceBusy;
    expect(busyAfter).toBe(busyBefore);

    const after = await retail.getRetail();
    expect(after.offers.some((o) => o.offerId === offer.offerId)).toBe(false);
  });

  it("庫存不足", async () => {
    const res = await retail.getRetail();
    const offer = res.offers[0];
    await setQty("item_bread", 0);
    await expect(retail.acceptOffer(offer.offerId)).rejects.toMatchObject({
      response: { message: "資源不足：item_bread", statusCode: 400 },
    });
  });

  it("客單已失效（過期）", async () => {
    const res = await retail.getRetail();
    const offer = res.offers[0];
    await prisma.playerRetailState.update({
      where: { playerId: "player_local" },
      data: {
        offers: [{ ...offer, slot: 0, expiresAt: Date.now() - 1000 }],
      },
    });
    await expect(retail.acceptOffer(offer.offerId)).rejects.toMatchObject({
      response: { message: "客單已失效", statusCode: 400 },
    });
  });

  it("重複接同一單", async () => {
    const res = await retail.getRetail();
    const offer = res.offers[0];
    await setQty("item_bread", offer.qty * 2);
    await retail.acceptOffer(offer.offerId);
    await expect(retail.acceptOffer(offer.offerId)).rejects.toMatchObject({
      response: { message: "客單已失效", statusCode: 400 },
    });
  });

  it("MK 固定價賣出仍走原端點", async () => {
    await setQty("item_bread", 1);
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 0);
    const mk = await market.sell("item_bread", 1);
    expect(mk.unitPrice).toBe(8);
    expect(mk.transportFee).toBe(1);
  });
});
