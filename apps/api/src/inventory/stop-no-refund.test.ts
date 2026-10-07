import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { InventoryService } from "./inventory.service";
import { SimulationService } from "../simulation/simulation.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 已拍板 D6：stop 不退還 start 已扣輸入。
 */
describe("stop 不退還已扣輸入（D6）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;

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

  it("start 扣料後 stop，庫存不恢復", async () => {
    const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
    const field = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(field).toBeTruthy();
    if (field!.status === "ready") await inventory.collect(fieldId);
    else if (field!.status === "running") await inventory.stop(fieldId);
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceBusy: 0 },
    });

    const beforeSeed = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_seed_wheat" } },
    });
    const beforeWater = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_water" } },
    });
    const seedBefore = Number(beforeSeed?.quantity ?? 0);
    const waterBefore = Number(beforeWater?.quantity ?? 0);

    await inventory.start(fieldId, "method_grow_wheat_default");
    const afterStartSeed = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_seed_wheat" } },
    });
    const afterStartWater = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_water" } },
    });
    expect(Number(afterStartSeed?.quantity)).toBe(seedBefore - 1);
    expect(Number(afterStartWater?.quantity)).toBe(waterBefore - 1);

    await inventory.stop(fieldId);
    const afterStopSeed = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_seed_wheat" } },
    });
    const afterStopWater = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_water" } },
    });
    expect(Number(afterStopSeed?.quantity)).toBe(seedBefore - 1);
    expect(Number(afterStopWater?.quantity)).toBe(waterBefore - 1);
  });
});
