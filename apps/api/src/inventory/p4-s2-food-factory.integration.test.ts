import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  ITEM_SETTLEMENT_CURRENCY_ID,
  LOCAL_PLAYER_ID,
  LAND_ERROR_COPY,
  RETAIL_SKU_ID,
  resolveSellGoldAfterTransport,
} from "@ascent/shared";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { syncCatalog } from "../../prisma/sync-catalog";
import { MarketService } from "../market/market.service";

describe.sequential("P4-S2 食品廠（蛋糕）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let market: MarketService;

  const ovenId = `pb_${LOCAL_PLAYER_ID}_bdef_oven`;
  const millId = `pb_${LOCAL_PLAYER_ID}_bdef_mill`;
  const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    const sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
    market = new MarketService(prisma, sim, inventory);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    removeTestDatabase(databaseUrl);
  });

  async function windBuildingBack(buildingId: string, realSecAgo: number) {
    const past = new Date(Date.now() - realSecAgo * 1000);
    await prisma.playerBuilding.update({
      where: { id: buildingId },
      data: { lastSettledAt: past, lastUpdate: past },
    });
    await inventory.building(buildingId);
  }

  async function setQty(itemId: string, quantity: number) {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
      update: { quantity },
      create: { playerId: LOCAL_PLAYER_ID, itemId, quantity },
    });
  }

  it("syncCatalog 冪等且 validateCatalog 為綠", async () => {
    await syncCatalog(prisma);
    await syncCatalog(prisma);
    const factory = await prisma.buildingDef.findUnique({ where: { id: "bdef_food_factory" } });
    expect(factory?.name).toBe("食品廠");
    const cake = await prisma.item.findUnique({ where: { id: "item_cake" } });
    expect(cake?.derivedTier).toBe(2);
    const method = await prisma.productionMethod.findUnique({ where: { id: "method_bake_cake_default" } });
    expect(method?.durationGameSec).toBe(1800);
  });

  it("放置食品廠 0 金且槽計數正確", async () => {
    const stateBefore = await inventory.state();
    const goldBefore =
      stateBefore.inventory.find((r) => r.itemId === ITEM_SETTLEMENT_CURRENCY_ID)?.quantity ?? 0;
    const countBefore = stateBefore.buildingCount;

    const placed = await inventory.place("bdef_food_factory");
    expect(placed.buildingDefId).toBe("bdef_food_factory");
    expect(placed.autoEnabled).toBe(false);

    const stateAfter = await inventory.state();
    const goldAfter =
      stateAfter.inventory.find((r) => r.itemId === ITEM_SETTLEMENT_CURRENCY_ID)?.quantity ?? 0;
    expect(Number(goldAfter)).toBe(Number(goldBefore));
    expect(stateAfter.buildingCount).toBe(countBefore + 1);
    expect(stateAfter.buildingSlotCap).toBe(12);
  });

  it("焗蛋糕消耗、工資運費與 30 秒產出", async () => {
    const factory = await inventory.place("bdef_food_factory");
    await setQty("item_flour", 1);
    await setQty("item_egg", 2);
    await setQty("item_milk", 1);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    const goldBefore = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });

    await inventory.start(factory.id, "method_bake_cake_default");
    const running = await prisma.playerBuilding.findUnique({ where: { id: factory.id } });
    expect(running?.status).toBe("running");

    const goldAfterStart = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });
    expect(Number(goldBefore?.quantity) - Number(goldAfterStart?.quantity)).toBe(32);

    await windBuildingBack(factory.id, 30);
    const ready = await prisma.playerBuilding.findUnique({ where: { id: factory.id } });
    expect(ready?.status).toBe("ready");

    await inventory.collect(factory.id);
    const cake = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_cake" } },
    });
    expect(Number(cake?.quantity)).toBeGreaterThanOrEqual(1);
  });

  it("缺蛋 → 400 資源不足：雞蛋", async () => {
    const factory = await inventory.place("bdef_food_factory");
    await setQty("item_flour", 1);
    await setQty("item_egg", 0);
    await setQty("item_milk", 1);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    await expect(inventory.start(factory.id, "method_bake_cake_default")).rejects.toThrow("資源不足：雞蛋");
  });

  it("MK 賣 1 蛋糕淨收 27", async () => {
    await setQty("item_cake", 1);
    const before = await market.getMarket();
    await market.sell("item_cake", 1);
    const after = await market.getMarket();
    expect(Number(after.gold) - Number(before.gold)).toBe(27);
    expect(resolveSellGoldAfterTransport("item_cake", 28, 1)?.netGold).toBe(27);
  });

  it("貨架／零售 SKU 仍為麵包", () => {
    expect(RETAIL_SKU_ID).toBe("item_bread");
  });

  it("state.opsCosts 含食品廠工資與運費", async () => {
    const state = await inventory.state();
    expect(state.opsCosts.wageByBuilding.bdef_food_factory).toBe(30);
    expect(state.opsCosts.haulByBuilding.bdef_food_factory).toBe(2);
    expect(state.opsCosts.sellTransport.item_cake).toBe(1);
  });

  it("麵粉僅 1 時爐（和麵）優先於食品廠", async () => {
    const factory = await inventory.place("bdef_food_factory");
    await setQty("item_flour", 1);
    await setQty("item_water", 5);
    await setQty("item_egg", 10);
    await setQty("item_milk", 10);
    await inventory.patchBuildingAuto(ovenId, {
      autoMethodId: "method_make_dough_default",
      autoEnabled: true,
    });
    await prisma.playerBuilding.update({
      where: { id: factory.id },
      data: { autoEnabled: true },
    });
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 1, workforceBusy: 0 },
    });

    await inventory.settleAll();

    const oven = await prisma.playerBuilding.findUnique({ where: { id: ovenId } });
    const foodFactory = await prisma.playerBuilding.findUnique({ where: { id: factory.id } });
    expect(oven?.status).toBe("running");
    expect(foodFactory?.status).toBe("idle");
  });

  it("同 def 不可重複放置食品廠", async () => {
    await inventory.place("bdef_food_factory");
    await expect(inventory.place("bdef_food_factory")).rejects.toThrow(LAND_ERROR_COPY.DUPLICATE_BUILDING_DEF);
  });
});
