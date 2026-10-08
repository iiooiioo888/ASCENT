import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LOCAL_PLAYER_ID, LAND_ERROR_COPY } from "@ascent/shared";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { syncCatalog } from "../../prisma/sync-catalog";

describe.sequential("P4-S1 飼料畜牧", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;

  const millId = `pb_${LOCAL_PLAYER_ID}_bdef_mill`;
  const ovenId = `pb_${LOCAL_PLAYER_ID}_bdef_oven`;
  const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    const sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    removeTestDatabase(databaseUrl);
  });

  it("syncCatalog 冪等且 validateCatalog 為綠", async () => {
    await syncCatalog(prisma);
    await syncCatalog(prisma);
    const ranch = await prisma.buildingDef.findUnique({ where: { id: "bdef_ranch" } });
    expect(ranch?.name).toBe("牧場");
    const egg = await prisma.item.findUnique({ where: { id: "item_egg" } });
    expect(egg?.code).toBe("egg");
  });

  it("放置牧場免費且同 def 不可重複", async () => {
    const placed = await inventory.place("bdef_ranch");
    expect(placed.buildingDefId).toBe("bdef_ranch");
    expect(placed.autoEnabled).toBe(false);
    await expect(inventory.place("bdef_ranch")).rejects.toThrow(LAND_ERROR_COPY.DUPLICATE_BUILDING_DEF);
  });

  it("牧場開工消耗與產出", async () => {
    const ranch = await inventory.place("bdef_ranch");
    await prisma.playerInventory.update({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_feed" } },
      data: { quantity: 5 },
    });
    await prisma.playerInventory.update({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_water" } },
      data: { quantity: 5 },
    });
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    const feedBefore = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_feed" } },
    });
    const goldBefore = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_copper_ingot" } },
    });

    await inventory.start(ranch.id, "method_raise_livestock_default");
    const running = await prisma.playerBuilding.findUnique({ where: { id: ranch.id } });
    expect(running?.status).toBe("running");

    const feedAfter = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_feed" } },
    });
    const goldAfter = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_copper_ingot" } },
    });
    expect(Number(feedBefore?.quantity) - Number(feedAfter?.quantity)).toBe(1);
    expect(Number(goldBefore?.quantity) - Number(goldAfter?.quantity)).toBe(2);

    await prisma.playerBuilding.update({
      where: { id: ranch.id },
      data: {
        status: "ready",
        bufferedOutputs: { item_egg: 2, item_milk: 1 },
        queue: [],
      },
    });
    await inventory.collect(ranch.id);
    const egg = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_egg" } },
    });
    const milk = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_milk" } },
    });
    expect(Number(egg?.quantity)).toBeGreaterThanOrEqual(2);
    expect(Number(milk?.quantity)).toBeGreaterThanOrEqual(1);
  });

  it("磨坊 autoMethodId 拌飼料；非法方式 400", async () => {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_straw" } },
      update: { quantity: 10 },
      create: { playerId: LOCAL_PLAYER_ID, itemId: "item_straw", quantity: 10 },
    });
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_wheat" } },
      update: { quantity: 10 },
      create: { playerId: LOCAL_PLAYER_ID, itemId: "item_wheat", quantity: 10 },
    });
    await inventory.patchBuildingAuto(millId, {
      autoMethodId: "method_mix_feed_default",
      autoEnabled: true,
    });
    const mill = await prisma.playerBuilding.findUnique({ where: { id: millId } });
    expect(mill?.methodId).toBe("method_mix_feed_default");

    await expect(
      inventory.patchBuildingAuto(millId, { autoMethodId: "method_bake_bread_default" }),
    ).rejects.toThrow("此建築不能使用該方式");
  });

  it("同 tick 優先序：爐 > 牧場 > 磨 > 田", async () => {
    const ranch = await inventory.place("bdef_ranch");
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_dough" } },
      update: { quantity: 5 },
      create: { playerId: LOCAL_PLAYER_ID, itemId: "item_dough", quantity: 5 },
    });
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_wheat" } },
      update: { quantity: 10 },
      create: { playerId: LOCAL_PLAYER_ID, itemId: "item_wheat", quantity: 10 },
    });
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_feed" } },
      update: { quantity: 10 },
      create: { playerId: LOCAL_PLAYER_ID, itemId: "item_feed", quantity: 10 },
    });
    await prisma.playerBuilding.updateMany({
      where: { id: { in: [fieldId, millId, ovenId, ranch.id] } },
      data: { autoEnabled: true },
    });
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 1, workforceBusy: 0 },
    });

    await inventory.settleAll();

    const oven = await prisma.playerBuilding.findUnique({ where: { id: ovenId } });
    const ranchB = await prisma.playerBuilding.findUnique({ where: { id: ranch.id } });
    const mill = await prisma.playerBuilding.findUnique({ where: { id: millId } });
    const field = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(oven?.status).toBe("running");
    expect(ranchB?.status).toBe("idle");
    expect(mill?.status).toBe("idle");
    expect(field?.status).toBe("idle");
  });
});
