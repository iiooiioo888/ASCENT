import { ITEM_SETTLEMENT_CURRENCY_ID, LOCAL_PLAYER_ID } from "@ascent/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateItemGoldToCopperIngot } from "../../prisma/curr-barter-migration";
import { PrismaService } from "../prisma/prisma.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";

describe("CURR-BARTER migration（整合）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    seedTestDatabase(databaseUrl);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    removeTestDatabase(databaseUrl);
  });

  it("item_gold 餘額 1:1 轉入銅錠並清零金錢", async () => {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_gold" } },
      update: { quantity: 25 },
      create: { playerId: LOCAL_PLAYER_ID, itemId: "item_gold", quantity: 25 },
    });
    await prisma.playerInventory.update({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
      data: { quantity: 10 },
    });

    await migrateItemGoldToCopperIngot(prisma);

    const gold = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: "item_gold" } },
    });
    const copper = await prisma.playerInventory.findUnique({
      where: {
        playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID },
      },
    });
    expect(Number(gold?.quantity)).toBe(0);
    expect(Number(copper?.quantity)).toBe(35);
  });
});
