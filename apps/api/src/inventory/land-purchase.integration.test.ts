import {
  FIELD_BUILDING_DEF_ID,
  ITEM_GOLD_ID,
  LOCAL_PLAYER_ID,
  PLAYER_BUILDING_SLOT_CAP,
  SILO_BUILDING_DEF_ID,
} from "@ascent/shared";
import { BadRequestException } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "./inventory.service";

describe("擴田（LAND-BE-1 整合）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await sim.refreshConfig();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    removeTestDatabase(databaseUrl);
  });

  async function setGold(qty: number) {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
      update: { quantity: qty },
      create: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID, quantity: qty },
    });
  }

  async function seedLegacySilo() {
    const now = new Date();
    await prisma.playerBuilding.create({
      data: {
        id: `pb_${LOCAL_PLAYER_ID}_${SILO_BUILDING_DEF_ID}_legacy`,
        playerId: LOCAL_PLAYER_ID,
        buildingDefId: SILO_BUILDING_DEF_ID,
        lastSettledAt: now,
        lastSettledGame: 0,
        lastUpdate: now,
        lastUpdateGame: 0,
        queue: [],
        inputs: {},
        outputs: {},
        bufferedOutputs: {},
        status: "idle",
      },
    });
  }

  it("金幣足夠時扣 10 金並新增第二塊田", async () => {
    await setGold(10);
    const res = await inventory.purchaseField();
    expect(res.pricePaid).toBe(10);
    expect(res.gold).toBe(0);
    expect(res.building.buildingDefId).toBe(FIELD_BUILDING_DEF_ID);

    const fields = await prisma.playerBuilding.findMany({
      where: { playerId: LOCAL_PLAYER_ID, buildingDefId: FIELD_BUILDING_DEF_ID },
    });
    expect(fields.length).toBe(2);
  });

  it("金幣不足 → 400", async () => {
    await setGold(9);
    await expect(inventory.purchaseField()).rejects.toMatchObject({
      response: { message: "金幣不足", statusCode: 400 },
    });
  });

  it("已有兩塊田 → 農田已達上限", async () => {
    await setGold(30);
    await inventory.purchaseField();
    await expect(inventory.purchaseField()).rejects.toMatchObject({
      response: { message: "農田已達上限", statusCode: 400 },
    });
  });

  it("佔槽建築達 cap 時拒買（與倉無關）", async () => {
    await setGold(50);
    const now = new Date();
    await prisma.playerBuilding.create({
      data: {
        id: `pb_${LOCAL_PLAYER_ID}_bdef_mill_extra`,
        playerId: LOCAL_PLAYER_ID,
        buildingDefId: "bdef_mill",
        lastSettledAt: now,
        lastSettledGame: 0,
        lastUpdate: now,
        lastUpdateGame: 0,
        queue: [],
        inputs: {},
        outputs: {},
        bufferedOutputs: {},
        status: "idle",
      },
    });
    await expect(inventory.purchaseField()).rejects.toMatchObject({
      response: { message: "建築欄位已滿", statusCode: 400 },
    });
  });

  it("舊檔倉不佔槽，仍可擴田", async () => {
    await seedLegacySilo();
    await setGold(10);
    const res = await inventory.purchaseField();
    expect(res.pricePaid).toBe(10);
    const state = await inventory.state();
    expect(state.fieldCount).toBe(2);
    expect(state.buildingCount).toBe(6);
  });

  it("POST /buildings 不可放置倉", async () => {
    await expect(inventory.place(SILO_BUILDING_DEF_ID)).rejects.toMatchObject({
      response: { message: "倉庫已隱藏，無法放置", statusCode: 400 },
    });
  });

  it("GET state 含 fieldCount／fieldCap（buildingCount 不含倉）", async () => {
    const state = await inventory.state();
    expect(state.fieldCount).toBe(1);
    expect(state.fieldCap).toBe(2);
    expect(state.buildingCount).toBe(5);
    expect(state.buildingSlotCap).toBe(PLAYER_BUILDING_SLOT_CAP);
    await seedLegacySilo();
    const withSilo = await inventory.state();
    expect(withSilo.buildingCount).toBe(5);
  });

  it("POST /buildings 不可直接放田", async () => {
    await expect(inventory.place(FIELD_BUILDING_DEF_ID)).rejects.toBeInstanceOf(BadRequestException);
  });
});
