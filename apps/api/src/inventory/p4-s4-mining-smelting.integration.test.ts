import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  ITEM_SETTLEMENT_CURRENCY_ID,
  LAND_ERROR_COPY,
  LOCAL_PLAYER_ID,
  defaultAutoMethodIdForBuilding,
  resolveSellGoldAfterTransport,
} from "@ascent/shared";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { syncCatalog } from "../../prisma/sync-catalog";
import { MarketService } from "../market/market.service";
import { CommodityMarketService } from "../market/commodity-market.service";

describe.sequential("P4-S4 礦冶（接大宗石油）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let market: MarketService;
  let commodities: CommodityMarketService;
  let sim: SimulationService;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
    market = new MarketService(prisma, sim, inventory);
    commodities = new CommodityMarketService(prisma, inventory);
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

  it("syncCatalog 冪等且 validateCatalog 為綠", async () => {
    await syncCatalog(prisma);
    await syncCatalog(prisma);
    const mine = await prisma.buildingDef.findUnique({ where: { id: "bdef_mine" } });
    expect(mine?.name).toBe("礦場");
    expect(mine?.systemCode).toBe("industry");
    const ore = await prisma.item.findUnique({ where: { id: "item_ore" } });
    expect(ore?.typeId).toBe("it_industrial");
    const mineMethod = await prisma.productionMethod.findUnique({ where: { id: "method_mine_ore_default" } });
    expect(mineMethod?.durationGameSec).toBe(2400);
    const smeltMethod = await prisma.productionMethod.findUnique({ where: { id: "method_smelt_iron_default" } });
    expect(smeltMethod?.durationGameSec).toBe(2400);
  });

  it("放置礦場／冶煉廠 0 銅且槽計數正確", async () => {
    const stateBefore = await inventory.state();
    const copperBefore =
      stateBefore.inventory.find((r) => r.itemId === ITEM_SETTLEMENT_CURRENCY_ID)?.quantity ?? 0;
    const countBefore = stateBefore.buildingCount;

    const mine = await inventory.place("bdef_mine");
    expect(mine.buildingDefId).toBe("bdef_mine");
    expect(mine.autoEnabled).toBe(false);

    const smelter = await inventory.place("bdef_smelter");
    expect(smelter.buildingDefId).toBe("bdef_smelter");
    expect(smelter.autoEnabled).toBe(false);

    const stateAfter = await inventory.state();
    const copperAfter =
      stateAfter.inventory.find((r) => r.itemId === ITEM_SETTLEMENT_CURRENCY_ID)?.quantity ?? 0;
    expect(Number(copperAfter)).toBe(Number(copperBefore));
    expect(stateAfter.buildingCount).toBe(countBefore + 2);
    expect(stateAfter.buildingSlotCap).toBe(12);
  });

  it("礦場：1 水 → 40s → 2 礦石；工資 20、運費 0", async () => {
    const mine = await inventory.place("bdef_mine");
    await setQty("item_water", 5);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    const copperBefore = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });

    await inventory.start(mine.id, "method_mine_ore_default");
    const copperAfterStart = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });
    expect(Number(copperBefore?.quantity) - Number(copperAfterStart?.quantity)).toBe(20);

    await windBuildingBack(mine.id, 40);
    await inventory.collect(mine.id);
    const ore = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_ore" } },
    });
    expect(Number(ore?.quantity)).toBeGreaterThanOrEqual(2);
  });

  it("冶煉：2 礦＋1 石油 → 40s → 2 鐵；工資 30＋運費 2", async () => {
    const smelter = await inventory.place("bdef_smelter");
    await setQty("item_ore", 2);
    await setQty("item_oil", 1);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    const copperBefore = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });

    await inventory.start(smelter.id, "method_smelt_iron_default");
    const copperAfterStart = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });
    expect(Number(copperBefore?.quantity) - Number(copperAfterStart?.quantity)).toBe(32);

    await windBuildingBack(smelter.id, 40);
    await inventory.collect(smelter.id);
    const iron = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_iron" } },
    });
    expect(Number(iron?.quantity)).toBeGreaterThanOrEqual(2);
    const oil = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_oil" } },
    });
    expect(Number(oil?.quantity ?? 0)).toBe(0);
  });

  it("缺油 → 400 資源不足：石油", async () => {
    const smelter = await inventory.place("bdef_smelter");
    await setQty("item_ore", 2);
    await setQty("item_oil", 0);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 2, workforceBusy: 0 },
    });

    await expect(inventory.start(smelter.id, "method_smelt_iron_default")).rejects.toThrow("資源不足：石油");
  });

  it("MK 賣鐵淨收 14（15−1）；賣礦 2", async () => {
    await setQty("item_iron", 1);
    const beforeIron = await market.getMarket();
    await market.sell("item_iron", 1);
    const afterIron = await market.getMarket();
    expect(Number(afterIron.gold) - Number(beforeIron.gold)).toBe(14);
    expect(resolveSellGoldAfterTransport("item_iron", 15, 1)?.netGold).toBe(14);

    await setQty("item_ore", 1);
    const beforeOre = await market.getMarket();
    await market.sell("item_ore", 1);
    const afterOre = await market.getMarket();
    expect(Number(afterOre.gold) - Number(beforeOre.gold)).toBe(2);
  });

  it("大宗 commodities 仍僅 oil；ore 下單拒絕", async () => {
    const res = await commodities.getCommodities();
    expect(res.listings).toHaveLength(1);
    expect(res.listings[0].commodityId).toBe("oil");
    await setQty(ITEM_SETTLEMENT_CURRENCY_ID, 100);
    await expect(commodities.buyCommodity("ore", 1)).rejects.toMatchObject({
      response: { message: "不可交易：ore", statusCode: 400 },
    });
  });

  it("state.opsCosts 含礦場／冶煉廠工資與運費", async () => {
    const state = await inventory.state();
    expect(state.opsCosts.wageByBuilding.bdef_mine).toBe(20);
    expect(state.opsCosts.haulByBuilding.bdef_mine).toBe(0);
    expect(state.opsCosts.wageByBuilding.bdef_smelter).toBe(30);
    expect(state.opsCosts.haulByBuilding.bdef_smelter).toBe(2);
    expect(state.opsCosts.sellTransport.item_iron).toBe(1);
  });

  it("礦場／冶煉廠預設 AFK 配方", () => {
    expect(defaultAutoMethodIdForBuilding("bdef_mine")).toBe("method_mine_ore_default");
    expect(defaultAutoMethodIdForBuilding("bdef_smelter")).toBe("method_smelt_iron_default");
  });

  it("同 def 不可重複放置礦場", async () => {
    await inventory.place("bdef_mine");
    await expect(inventory.place("bdef_mine")).rejects.toThrow(LAND_ERROR_COPY.DUPLICATE_BUILDING_DEF);
  });
});
