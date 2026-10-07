import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AFK_AUTO_PAUSE_REASON, LOCAL_PLAYER_ID } from "@ascent/shared";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";

describe.sequential("AFK-BE-1 自動開工", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;
  const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
  const growMethodId = "method_grow_wheat_default";

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

  async function ensureFieldIdle() {
    const field = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    if (!field) return false;
    if (field.status === "ready") await inventory.collect(fieldId);
    else if (field.status === "running") await inventory.stop(fieldId);
    await prisma.playerBuilding.update({
      where: { id: fieldId },
      data: { autoEnabled: false, autoPauseReason: null },
    });
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceBusy: 0 },
    });
    return true;
  }

  it("PATCH autoEnabled 持久化並在 GET state 回傳", async () => {
    if (!(await ensureFieldIdle())) return;

    const on = await inventory.setAutoEnabled(fieldId, true);
    expect(on.autoEnabled).toBe(true);
    expect(on.autoPauseReason).toBeNull();

    const state = await inventory.state();
    const field = state.buildings.find((b) => b.id === fieldId);
    expect(field).toMatchObject({ autoEnabled: true, autoPauseReason: null });

    const off = await inventory.setAutoEnabled(fieldId, false);
    expect(off.autoEnabled).toBe(false);
    expect(off.autoPauseReason).toBeNull();
  });

  it("開 auto 且 idle 有料有人時自動開工", async () => {
    if (!(await ensureFieldIdle())) return;

    await inventory.setAutoEnabled(fieldId, true);
    const field = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(field?.status).toBe("running");
    expect(field?.methodId).toBe(growMethodId);
    expect(field?.autoPauseReason).toBeNull();

    await inventory.stop(fieldId);
    const afterStop = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(afterStop?.autoEnabled).toBe(true);
    expect(afterStop?.status).toBe("idle");
    await inventory.setAutoEnabled(fieldId, false);
  });

  it("缺料時寫入 autoPauseReason 且不開產", async () => {
    if (!(await ensureFieldIdle())) return;

    await prisma.playerInventory.updateMany({
      where: { playerId: LOCAL_PLAYER_ID, itemId: { in: ["item_seed_wheat", "item_water"] } },
      data: { quantity: 0 },
    });

    await inventory.setAutoEnabled(fieldId, true);
    const field = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(field?.status).toBe("idle");
    expect(field?.autoPauseReason).toBe(AFK_AUTO_PAUSE_REASON.MATERIALS);
  });

  it("collect 後連環自動再開工", async () => {
    if (!(await ensureFieldIdle())) return;

    await inventory.setAutoEnabled(fieldId, true);
    expect((await prisma.playerBuilding.findUnique({ where: { id: fieldId } }))?.status).toBe("running");

    await inventory.stop(fieldId);
    expect((await prisma.playerBuilding.findUnique({ where: { id: fieldId } }))?.status).toBe("idle");

    await prisma.playerBuilding.update({
      where: { id: fieldId },
      data: {
        status: "ready",
        queue: [{ methodId: growMethodId, durationGameSec: 1, elapsedGameSec: 1, inputs: {}, outputs: { item_wheat: 1 } }],
        bufferedOutputs: { item_wheat: 1 },
      },
    });

    const collected = await inventory.collect(fieldId);
    expect(collected.status).toBe("running");
    expect(collected.autoEnabled).toBe(true);
    expect(collected.autoPauseReason).toBeNull();
  });
});
