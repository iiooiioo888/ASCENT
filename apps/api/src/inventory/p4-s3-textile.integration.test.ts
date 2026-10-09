import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ENVIRONMENT_CONFIG,
  FIELD_CAP,
  ITEM_SETTLEMENT_CURRENCY_ID,
  LOCAL_PLAYER_ID,
  LAND_ERROR_COPY,
  defaultAutoMethodIdForBuilding,
  fieldPurchasePriceGold,
  isFallowActive,
  resolveSellGoldAfterTransport,
} from "@ascent/shared";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { syncCatalog } from "../../prisma/sync-catalog";
import { MarketService } from "../market/market.service";

describe.sequential("P4-S3 紡織（棉花）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let market: MarketService;
  let sim: SimulationService;

  const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
  const growCottonMethodId = "method_grow_cotton_default";

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

  async function resetFieldFallow() {
    const b = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    if (!b) return;
    if (b.status === "ready") await inventory.collect(fieldId);
    else if (b.status === "running") await inventory.stop(fieldId);
    await prisma.playerBuilding.update({
      where: { id: fieldId },
      data: { fallowUntilGame: null },
    });
  }

  it("syncCatalog 冪等且 validateCatalog 為綠", async () => {
    await syncCatalog(prisma);
    await syncCatalog(prisma);
    const mill = await prisma.buildingDef.findUnique({ where: { id: "bdef_textile_mill" } });
    expect(mill?.name).toBe("紡織廠");
    const cloth = await prisma.item.findUnique({ where: { id: "item_cloth" } });
    expect(cloth?.typeId).toBe("it_industrial");
    const grow = await prisma.productionMethod.findUnique({ where: { id: growCottonMethodId } });
    expect(grow?.durationGameSec).toBe(3600);
    const weave = await prisma.productionMethod.findUnique({ where: { id: "method_weave_cloth_default" } });
    expect(weave?.durationGameSec).toBe(1800);
    const fieldDef = await prisma.buildingDef.findUnique({ where: { id: "bdef_field" } });
    expect(fieldDef?.allowedRuleIds).toContain("rule_grow_cotton");
  });

  it("FIELD_CAP=3、第三塊田價 18", () => {
    expect(FIELD_CAP).toBe(3);
    expect(fieldPurchasePriceGold(2)).toBe(18);
  });

  it("放置紡織廠 0 銅且槽計數正確", async () => {
    const stateBefore = await inventory.state();
    const copperBefore =
      stateBefore.inventory.find((r) => r.itemId === ITEM_SETTLEMENT_CURRENCY_ID)?.quantity ?? 0;
    const countBefore = stateBefore.buildingCount;

    const placed = await inventory.place("bdef_textile_mill");
    expect(placed.buildingDefId).toBe("bdef_textile_mill");
    expect(placed.autoEnabled).toBe(false);

    const stateAfter = await inventory.state();
    const copperAfter =
      stateAfter.inventory.find((r) => r.itemId === ITEM_SETTLEMENT_CURRENCY_ID)?.quantity ?? 0;
    expect(Number(copperAfter)).toBe(Number(copperBefore));
    expect(stateAfter.buildingCount).toBe(countBefore + 1);
    expect(stateAfter.buildingSlotCap).toBe(12);
    expect(stateAfter.fieldCap).toBe(3);
  });

  it("田種棉：1 棉種＋1 水 → 約 60s → 3 棉；收成後休耕", async () => {
    await resetFieldFallow();
    await setQty("item_seed_cotton", 5);
    await setQty("item_water", 5);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    await inventory.start(fieldId, growCottonMethodId);
    const running = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(running?.status).toBe("running");

    await windBuildingBack(fieldId, 60);
    const ready = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(ready?.status).toBe("ready");

    await inventory.collect(fieldId);
    const cotton = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_cotton" } },
    });
    expect(Number(cotton?.quantity)).toBeGreaterThanOrEqual(3);

    const row = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    const clock = await prisma.serverState.findUniqueOrThrow({ where: { id: 1 } });
    const game = sim.displayGameTime(
      {
        startRealTimeMs: clock.startRealTime.getTime(),
        startGameTime: Number(clock.startGameTime),
      },
      Date.now(),
    );
    const until = Number(row!.fallowUntilGame);
    expect(isFallowActive(until, game)).toBe(true);
    const slackGameSec = 120;
    const expectedMin = game + DEFAULT_ENVIRONMENT_CONFIG.fallowDurationGameSec - slackGameSec;
    const expectedMax = game + DEFAULT_ENVIRONMENT_CONFIG.fallowDurationGameSec + slackGameSec;
    expect(until).toBeGreaterThanOrEqual(expectedMin);
    expect(until).toBeLessThanOrEqual(expectedMax);
  });

  it("紡織：3 棉 → 30s → 1 布；工資 20＋運費 1", async () => {
    const factory = await inventory.place("bdef_textile_mill");
    await setQty("item_cotton", 3);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    const copperBefore = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });

    await inventory.start(factory.id, "method_weave_cloth_default");
    const running = await prisma.playerBuilding.findUnique({ where: { id: factory.id } });
    expect(running?.status).toBe("running");

    const copperAfterStart = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });
    expect(Number(copperBefore?.quantity) - Number(copperAfterStart?.quantity)).toBe(21);

    await windBuildingBack(factory.id, 30);
    const ready = await prisma.playerBuilding.findUnique({ where: { id: factory.id } });
    expect(ready?.status).toBe("ready");

    await inventory.collect(factory.id);
    const cloth = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_cloth" } },
    });
    expect(Number(cloth?.quantity)).toBeGreaterThanOrEqual(1);
  });

  it("缺棉 → 400 資源不足：棉花", async () => {
    const factory = await inventory.place("bdef_textile_mill");
    await setQty("item_cotton", 0);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    await expect(inventory.start(factory.id, "method_weave_cloth_default")).rejects.toThrow("資源不足：棉花");
  });

  it("MK 賣 1 布淨收 11", async () => {
    await setQty("item_cloth", 1);
    const before = await market.getMarket();
    await market.sell("item_cloth", 1);
    const after = await market.getMarket();
    expect(Number(after.gold) - Number(before.gold)).toBe(11);
    expect(resolveSellGoldAfterTransport("item_cloth", 12, 1)?.netGold).toBe(11);
  });

  it("state.opsCosts 含紡織廠工資與運費", async () => {
    const state = await inventory.state();
    expect(state.opsCosts.wageByBuilding.bdef_textile_mill).toBe(20);
    expect(state.opsCosts.haulByBuilding.bdef_textile_mill).toBe(1);
    expect(state.opsCosts.sellTransport.item_cloth).toBe(1);
  });

  it("紡織廠預設 AFK 配方；田可掛種棉", async () => {
    expect(defaultAutoMethodIdForBuilding("bdef_textile_mill")).toBe("method_weave_cloth_default");

    await resetFieldFallow();
    await setQty("item_seed_cotton", 10);
    await setQty("item_water", 10);
    await inventory.patchBuildingAuto(fieldId, {
      autoMethodId: growCottonMethodId,
      autoEnabled: true,
    });
    const field = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(field?.autoMethodId).toBe(growCottonMethodId);

    await expect(
      inventory.patchBuildingAuto(fieldId, { autoMethodId: "method_weave_cloth_default" }),
    ).rejects.toThrow("此建築不能使用該方式");
  });

  it("同 def 不可重複放置紡織廠", async () => {
    await inventory.place("bdef_textile_mill");
    await expect(inventory.place("bdef_textile_mill")).rejects.toThrow(LAND_ERROR_COPY.DUPLICATE_BUILDING_DEF);
  });

  it("第四塊田 → 農田已達上限", async () => {
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 50);
    await inventory.purchaseField();
    await inventory.purchaseField();
    await expect(inventory.purchaseField()).rejects.toMatchObject({
      response: { message: LAND_ERROR_COPY.FIELD_AT_CAP },
    });
  });
});
