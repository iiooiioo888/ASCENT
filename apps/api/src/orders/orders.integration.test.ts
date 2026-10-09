import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { runWithPlayer } from "../auth/player-context";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { OrdersService } from "./orders.service";

describe("NPC 訂單最小切片", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let orders: OrdersService;

  beforeAll(() => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    const sim = new SimulationService(prisma);
    orders = new OrdersService(prisma, sim);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await new SimulationService(prisma).refreshConfig();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (databaseUrl) removeTestDatabase(databaseUrl);
  });

  it("接受訂單扣麵包發銅錠，重送不雙扣", async () => {
    const orderId = "npcord_test_bread";
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_bread" } },
      update: { quantity: 10 },
      create: { playerId: LOCAL_PLAYER_ID, itemId: "item_bread", quantity: 10 },
    });
    const copperBefore = await prisma.playerInventory.findUniqueOrThrow({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_copper_ingot" } },
    });
    await prisma.playerNpcOrder.create({
      data: {
        id: orderId,
        playerId: LOCAL_PLAYER_ID,
        ruleId: "npc_merchant_bread",
        spawnBucket: 0,
        status: "pending",
        requiredItems: [{ item_id: "item_bread", quantity: 2 }],
        rewardsSnapshot: [{ kind: "gold", item_id: "item_copper_ingot", quantity: 24 }],
        createdGameSec: 0,
        expiresGameSec: 1_000_000,
      },
    });

    const first = await runWithPlayer(LOCAL_PLAYER_ID, () => orders.accept(orderId));
    expect(first.status).toBe("completed");
    const breadAfter = await prisma.playerInventory.findUniqueOrThrow({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_bread" } },
    });
    const copperAfter = await prisma.playerInventory.findUniqueOrThrow({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_copper_ingot" } },
    });
    expect(Number(breadAfter.quantity)).toBe(8);
    expect(Number(copperAfter.quantity)).toBe(Number(copperBefore.quantity) + 24);

    const second = await runWithPlayer(LOCAL_PLAYER_ID, () => orders.accept(orderId));
    expect(second.status).toBe("completed");
    const breadAgain = await prisma.playerInventory.findUniqueOrThrow({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_bread" } },
    });
    const copperAgain = await prisma.playerInventory.findUniqueOrThrow({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_copper_ingot" } },
    });
    expect(Number(breadAgain.quantity)).toBe(8);
    expect(Number(copperAgain.quantity)).toBe(Number(copperAfter.quantity));
  });
});
