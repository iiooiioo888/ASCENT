import { LOCAL_PLAYER_ID, playerProgressFromDb } from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { runWithPlayer } from "../auth/player-context";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "./inventory.service";

const FIELD_ID = `pb_${LOCAL_PLAYER_ID}_bdef_field`;

describe("收取里程碑", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let inventory: InventoryService;

  beforeAll(() => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    inventory = new InventoryService(prisma, new SimulationService(prisma));
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await new SimulationService(prisma).refreshConfig();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (databaseUrl) removeTestDatabase(databaseUrl);
  });

  it("收取 4 個麵包後解鎖礦業", async () => {
    const now = new Date();
    await prisma.playerBuilding.update({
      where: { id: FIELD_ID },
      data: {
        status: "ready",
        lastSettledAt: now,
        bufferedOutputs: { item_bread: 4 },
        queue: [],
      },
    });
    await runWithPlayer(LOCAL_PLAYER_ID, () => inventory.collect(FIELD_ID));
    const player = await prisma.player.findUniqueOrThrow({ where: { id: LOCAL_PLAYER_ID } });
    const progress = playerProgressFromDb(player.progress);
    expect(progress.lifetimeCollected.item_bread).toBe(4);
    expect(progress.unlockedIndustries).toContain("mining");
  });
});
