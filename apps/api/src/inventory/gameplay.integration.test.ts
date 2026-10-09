import { FIELD_CULTIVATION_INTENSIVE, LOCAL_PLAYER_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { runWithPlayer } from "../auth/player-context";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { OrdersService } from "../orders/orders.service";
import { InventoryService } from "./inventory.service";

const FIELD_ID = `pb_${LOCAL_PLAYER_ID}_bdef_field`;

describe("遊戲性：代數／耕作／訂單板", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;

  beforeAll(() => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    const sim = new SimulationService(prisma);
    const orders = new OrdersService(prisma, sim);
    inventory = new InventoryService(prisma, sim, orders);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await new SimulationService(prisma).refreshConfig();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (databaseUrl) removeTestDatabase(databaseUrl);
  });

  it("第 1 代種子開工小麥產出 2.4", async () => {
    await prisma.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: {
        progress: {
          lifetimeCollected: {},
          unlockedIndustries: ["agriculture"],
          seedLineage: { item_seed_wheat: 1, item_wheat: 0 },
        },
      },
    });
    await runWithPlayer(LOCAL_PLAYER_ID, () =>
      inventory.start(FIELD_ID, "method_grow_wheat_default"),
    );
    const building = await prisma.playerBuilding.findUniqueOrThrow({ where: { id: FIELD_ID } });
    const queue = building.queue as { outputs: Record<string, number>; lineage?: { produce?: Record<string, number> } }[];
    expect(queue[0]?.outputs.item_wheat).toBe(2.4);
    expect(queue[0]?.lineage?.produce?.item_wheat).toBe(1);
  });

  it("密集耕作佔 2 槽且產出 ×1.3", async () => {
    await runWithPlayer(LOCAL_PLAYER_ID, () =>
      inventory.patchCultivation(FIELD_ID, FIELD_CULTIVATION_INTENSIVE),
    );
    const after = await prisma.playerBuilding.findUniqueOrThrow({ where: { id: FIELD_ID } });
    expect(after.specialization).toBe(FIELD_CULTIVATION_INTENSIVE);
    await runWithPlayer(LOCAL_PLAYER_ID, () =>
      inventory.start(FIELD_ID, "method_grow_wheat_default"),
    );
    const building = await prisma.playerBuilding.findUniqueOrThrow({ where: { id: FIELD_ID } });
    const queue = building.queue as { outputs: Record<string, number> }[];
    expect(queue[0]?.outputs.item_wheat).toBe(2.6);
    const state = await runWithPlayer(LOCAL_PLAYER_ID, () => inventory.state());
    expect(state.buildingCount).toBe(6);
  });

  it("首次結算生成三階訂單板", async () => {
    const state = await runWithPlayer(LOCAL_PLAYER_ID, () => inventory.state());
    expect(state.npcOrders).toHaveLength(3);
    const labels = (state.npcOrders ?? []).map((row) => row.label);
    expect(labels).toEqual(expect.arrayContaining(["急單", "商約", "大單"]));
    const hard = (state.npcOrders ?? []).find((row) => row.tier === 3);
    expect(hard?.requiredItems[0]?.quantity).toBe(20);
  });
});
