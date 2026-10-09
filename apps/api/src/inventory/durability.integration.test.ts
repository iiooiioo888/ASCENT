import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "./inventory.service";
import { runWithPlayer } from "../auth/player-context";

const FIELD_ID = `pb_${LOCAL_PLAYER_ID}_bdef_field`;

describe("建築耐久磨損", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;

  beforeAll(() => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    const sim = new SimulationService(prisma);
    inventory = new InventoryService(prisma, sim);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await new SimulationService(prisma).refreshConfig();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (databaseUrl) removeTestDatabase(databaseUrl);
  });

  it("運轉中結算會磨耐久且可重播", async () => {
    const past = new Date(Date.now() - 60_000);
    await prisma.playerBuilding.update({
      where: { id: FIELD_ID },
      data: {
        status: "running",
        methodId: "method_grow_wheat_default",
        lastSettledAt: past,
        durability: 100,
        queue: [
          {
            methodId: "method_grow_wheat_default",
            durationGameSec: 3600,
            elapsedGameSec: 0,
            inputs: { item_seed_wheat: 1, item_water: 1 },
            outputs: { item_wheat: 2, item_straw: 1 },
          },
        ],
      },
    });

    await runWithPlayer(LOCAL_PLAYER_ID, () => inventory.settleAll());
    const first = await prisma.playerBuilding.findUniqueOrThrow({ where: { id: FIELD_ID } });
    expect(Number(first.durability)).toBeLessThan(100);

    await prisma.playerBuilding.update({
      where: { id: FIELD_ID },
      data: {
        lastSettledAt: past,
        durability: 100,
        status: "running",
        methodId: "method_grow_wheat_default",
        queue: [
          {
            methodId: "method_grow_wheat_default",
            durationGameSec: 3600,
            elapsedGameSec: 0,
            inputs: { item_seed_wheat: 1, item_water: 1 },
            outputs: { item_wheat: 2, item_straw: 1 },
          },
        ],
      },
    });
    await runWithPlayer(LOCAL_PLAYER_ID, () => inventory.settleAll());
    const second = await prisma.playerBuilding.findUniqueOrThrow({ where: { id: FIELD_ID } });
    expect(Number(second.durability)).toBeCloseTo(Number(first.durability), 3);
  });

  it("修復扣銅錠並把耐久拉回 100", async () => {
    await prisma.playerBuilding.update({
      where: { id: FIELD_ID },
      data: { durability: 70 },
    });
    const copperBefore = await prisma.playerInventory.findUniqueOrThrow({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_copper_ingot" } },
    });
    await runWithPlayer(LOCAL_PLAYER_ID, () => inventory.repair(FIELD_ID));
    const building = await prisma.playerBuilding.findUniqueOrThrow({ where: { id: FIELD_ID } });
    const copperAfter = await prisma.playerInventory.findUniqueOrThrow({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_copper_ingot" } },
    });
    expect(Number(building.durability)).toBe(100);
    expect(Number(copperAfter.quantity)).toBeLessThan(Number(copperBefore.quantity));
  });
});
