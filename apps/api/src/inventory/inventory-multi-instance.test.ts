import { BadRequestException, ConflictException } from "@nestjs/common";
import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { PrismaClient } from "../../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaAdapter } from "../prisma/create-prisma-adapter";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "./inventory.service";

const FIELD_BUILDING_ID = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
const GROW_METHOD_ID = "method_grow_wheat_default";

function createInventoryStack(client: PrismaClient) {
  const prisma = client as unknown as PrismaService;
  const sim = new SimulationService(prisma);
  const inventory = new InventoryService(prisma, sim);
  return { prisma, sim, inventory };
}

describe("InventoryService 多實例（兩個 PrismaClient 共用同一 DB）", () => {
  const clientA = new PrismaClient({ adapter: createPrismaAdapter() });
  const clientB = new PrismaClient({ adapter: createPrismaAdapter() });
  let stackA: ReturnType<typeof createInventoryStack>;
  let stackB: ReturnType<typeof createInventoryStack>;

  beforeAll(async () => {
    await Promise.all([clientA.$connect(), clientB.$connect()]);
    stackA = createInventoryStack(clientA);
    stackB = createInventoryStack(clientB);
    await Promise.all([stackA.sim.refreshConfig(), stackB.sim.refreshConfig()]);
  });

  afterAll(async () => {
    await Promise.all([clientA.$disconnect(), clientB.$disconnect()]);
  });

  it("併發 settleAll 不會雙重入帳 buffer", async () => {
    const past = new Date(Date.now() - 60_000);
    await clientA.playerBuilding.update({
      where: { id: FIELD_BUILDING_ID },
      data: {
        status: "running",
        methodId: GROW_METHOD_ID,
        lastSettledAt: past,
        queue: [
          {
            methodId: GROW_METHOD_ID,
            durationGameSec: 3600,
            elapsedGameSec: 0,
            inputs: { item_seed_wheat: 1, item_water: 1 },
            outputs: { item_wheat: 2, item_straw: 1 },
          },
        ],
        inputs: { item_seed_wheat: 1, item_water: 1 },
        outputs: { item_wheat: 2, item_straw: 1 },
        bufferedOutputs: {},
      },
    });

    await Promise.all([stackA.inventory.settleAll(), stackB.inventory.settleAll()]);

    const building = await clientA.playerBuilding.findUniqueOrThrow({ where: { id: FIELD_BUILDING_ID } });
    const buffered = building.bufferedOutputs as Record<string, number>;
    const wheat = buffered.item_wheat ?? 0;
    expect(wheat).toBeGreaterThan(0);
    expect(wheat).toBeLessThanOrEqual(120);
  });

  it("併發 collect 僅一次入庫，另一邊 409", async () => {
    const now = new Date();
    await clientA.playerBuilding.update({
      where: { id: FIELD_BUILDING_ID },
      data: {
        status: "ready",
        methodId: GROW_METHOD_ID,
        lastSettledAt: now,
        bufferedOutputs: { item_wheat: 4 },
        queue: [],
      },
    });

    const before = await clientA.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_wheat" } },
    });
    const qtyBefore = before ? Number(before.quantity) : 0;

    const results = await Promise.allSettled([
      stackA.inventory.collect(FIELD_BUILDING_ID),
      stackB.inventory.collect(FIELD_BUILDING_ID),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const err = (rejected[0] as PromiseRejectedResult).reason;
    expect(err).toBeInstanceOf(ConflictException);

    const after = await clientA.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_wheat" } },
    });
    expect(Number(after?.quantity ?? 0)).toBe(qtyBefore + 4);
  });

  it("併發 start 僅扣一次料，另一邊 409", async () => {
    const now = new Date();
    await clientA.playerBuilding.update({
      where: { id: FIELD_BUILDING_ID },
      data: {
        status: "idle",
        methodId: null,
        lastSettledAt: now,
        queue: [],
        inputs: {},
        outputs: {},
        bufferedOutputs: {},
      },
    });

    const seedBefore = await clientA.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_seed_wheat" } },
    });
    const waterBefore = await clientA.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_water" } },
    });
    const seedQty = seedBefore ? Number(seedBefore.quantity) : 0;
    const waterQty = waterBefore ? Number(waterBefore.quantity) : 0;

    const results = await Promise.allSettled([
      stackA.inventory.start(FIELD_BUILDING_ID, GROW_METHOD_ID),
      stackB.inventory.start(FIELD_BUILDING_ID, GROW_METHOD_ID),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const loser = (rejected[0] as PromiseRejectedResult).reason;
    expect(
      loser instanceof ConflictException || loser instanceof BadRequestException,
    ).toBe(true);

    const seedAfter = await clientA.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_seed_wheat" } },
    });
    const waterAfter = await clientA.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_water" } },
    });
    expect(Number(seedAfter?.quantity ?? 0)).toBe(seedQty - 1);
    expect(Number(waterAfter?.quantity ?? 0)).toBe(waterQty - 1);

    const building = await clientA.playerBuilding.findUniqueOrThrow({ where: { id: FIELD_BUILDING_ID } });
    expect(building.status).toBe("running");
  });
});
