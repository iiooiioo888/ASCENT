import { describe, expect, it, beforeAll } from "vitest";
import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { PrismaClient } from "../../generated/prisma/client";
import { createPrismaAdapter } from "../prisma/create-prisma-adapter";
import { InventoryService } from "./inventory.service";
import { SimulationService } from "../simulation/simulation.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 已拍板 D6：stop 不退還 start 已扣輸入。需已種子 DB（CI `setup:db`）。
 */
describe("stop 不退還已扣輸入（D6）", () => {
  const prisma = new PrismaClient({ adapter: createPrismaAdapter() }) as PrismaService;
  let inventory: InventoryService;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    const state = await prisma.serverState.findUnique({ where: { id: 1 } });
    if (!state) return;
    const sim = new SimulationService(prisma);
    await sim.onModuleInit();
    inventory = new InventoryService(prisma, sim);
  });

  it("start 扣料後 stop，庫存不恢復", async () => {
    if (!process.env.DATABASE_URL || !inventory) return;
    const state = await prisma.serverState.findUnique({ where: { id: 1 } });
    if (!state) return;

    const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
    const field = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    if (!field) {
      expect(field).toBeTruthy();
      return;
    }
    if (field.status === "ready") await inventory.collect(fieldId);
    else if (field.status === "running") await inventory.stop(fieldId);

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
