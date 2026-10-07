import {
  FIELD_BUILDING_DEF_ID,
  ITEM_GOLD_ID,
  LOCAL_PLAYER_ID,
  PLAYER_BUILDING_SLOT_CAP,
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

  it("建築槽滿時拒買", async () => {
    await setGold(50);
    await inventory.place("bdef_silo");
    expect(await prisma.playerBuilding.count({ where: { playerId: LOCAL_PLAYER_ID } })).toBe(
      PLAYER_BUILDING_SLOT_CAP,
    );
    await expect(inventory.purchaseField()).rejects.toMatchObject({
      response: { message: "建築欄位已滿", statusCode: 400 },
    });
  });

  it("GET state 含 fieldCount／fieldCap", async () => {
    const state = await inventory.state();
    expect(state.fieldCount).toBe(1);
    expect(state.fieldCap).toBe(2);
    expect(state.buildingCount).toBe(5);
    expect(state.buildingSlotCap).toBe(PLAYER_BUILDING_SLOT_CAP);
  });

  it("POST /buildings 不可直接放田", async () => {
    await expect(inventory.place(FIELD_BUILDING_DEF_ID)).rejects.toBeInstanceOf(BadRequestException);
  });
});
