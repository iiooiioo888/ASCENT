import { ITEM_GOLD_ID, LOCAL_PLAYER_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { InventoryService } from "../inventory/inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { WorkforceService } from "./workforce.service";

describe("工位池（OD-BE-1 整合）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;
  let workforce: WorkforceService;

  const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
  const wellId = `pb_${LOCAL_PLAYER_ID}_bdef_well`;
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
    workforce = new WorkforceService(prisma, sim, inventory);
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

  async function setHired(hired: number, busy = 0) {
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: hired, workforceBusy: busy },
    });
  }

  it("H1：hired=1 時第二座開工人手不足；collect 後可再開", async () => {
    await resetBuilding(fieldId);
    await resetBuilding(wellId);
    await setHired(1, 0);
    await setGold(20);

    await inventory.start(fieldId, growMethodId);
    await expect(inventory.start(wellId, drawMethodId)).rejects.toMatchObject({
      response: { message: "人手不足", statusCode: 400 },
    });

    await inventory.stop(fieldId);
    await inventory.start(wellId, drawMethodId);
    const well = await prisma.playerBuilding.findUnique({ where: { id: wellId } });
    expect(well?.status).toBe("running");
  });

  it("H2：僱工扣 8 金、hired=2，可兩座並行", async () => {
    await resetBuilding(fieldId);
    await resetBuilding(wellId);
    await setHired(1, 0);
    await setGold(20);

    const res = await workforce.hire();
    expect(res.workforce.hired).toBe(2);
    expect(res.gold).toBe(12);

    await inventory.start(fieldId, growMethodId);
    await inventory.start(wellId, drawMethodId);
    const player = await prisma.player.findUniqueOrThrow({ where: { id: LOCAL_PLAYER_ID } });
    expect(player.workforceBusy).toBe(2);
  });

  it("H3：開工扣工資；stop 唔退金", async () => {
    await resetBuilding(fieldId);
    await setHired(1, 0);
    await setGold(1);

    await inventory.start(fieldId, growMethodId);
    const afterStart = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
    });
    expect(Number(afterStart?.quantity)).toBe(0);

    await inventory.stop(fieldId);
    const afterStop = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
    });
    expect(Number(afterStop?.quantity)).toBe(0);
  });

  it("僱工上限：hired=8 拒絕", async () => {
    await setHired(8, 0);
    await setGold(100);
    await expect(workforce.hire()).rejects.toBeInstanceOf(BadRequestException);
    await expect(workforce.hire()).rejects.toMatchObject({
      response: { message: "已達僱工上限", statusCode: 400 },
    });
  });

  it("GET state 含 workforce 與 opsCosts", async () => {
    const state = await inventory.state();
    expect(state.workforce).toMatchObject({ hired: 1, busy: 0, free: 1, maxHired: 8 });
    expect(state.opsCosts.hireCostGold).toBe(8);
    expect(state.opsCosts.wageByBuilding.bdef_field).toBe(1);
    expect(state.opsCosts.haulByBuilding.bdef_mill).toBe(1);
    expect(state.opsCosts.sellTransport.item_bread).toBe(1);
    expect(state.opsCosts.laborCostPerStart).toBe(1);
  });

  it("金幣不足僱工", async () => {
    await setHired(1, 0);
    await setGold(7);
    await expect(workforce.hire()).rejects.toMatchObject({
      response: { message: "金幣不足", statusCode: 400 },
    });
  });
});
