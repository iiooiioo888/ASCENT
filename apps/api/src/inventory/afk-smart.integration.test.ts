import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";

describe.sequential("AFK-SMART D1 麵包鏈開工優先", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;

  const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
  const millId = `pb_${LOCAL_PLAYER_ID}_bdef_mill`;
  const ovenId = `pb_${LOCAL_PLAYER_ID}_bdef_oven`;

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

  async function resetChainBuildings() {
    for (const id of [fieldId, millId, ovenId]) {
      const b = await prisma.playerBuilding.findUnique({ where: { id } });
      if (!b) continue;
      if (b.status === "ready") await inventory.collect(id);
      else if (b.status === "running") await inventory.stop(id);
    }
    await prisma.playerBuilding.updateMany({
      where: { id: { in: [fieldId, millId, ovenId] } },
      data: { autoEnabled: false, autoPauseReason: null },
    });
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceHired: 1, workforceBusy: 0 },
    });
  }

  it("人手僅 1 時同 tick 優先開爐", async () => {
    await resetChainBuildings();
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
    await prisma.playerBuilding.updateMany({
      where: { id: { in: [fieldId, millId, ovenId] } },
      data: { autoEnabled: true },
    });

    await inventory.settleAll();

    const oven = await prisma.playerBuilding.findUnique({ where: { id: ovenId } });
    const mill = await prisma.playerBuilding.findUnique({ where: { id: millId } });
    const field = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(oven?.status).toBe("running");
    expect(mill?.status).toBe("idle");
    expect(field?.status).toBe("idle");
  });
});
