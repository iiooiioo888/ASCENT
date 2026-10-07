import { BadRequestException } from "@nestjs/common";
import {
  DEFAULT_ENVIRONMENT_CONFIG,
  LOCAL_PLAYER_ID,
  isFallowActive,
} from "@ascent/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";

describe("環境循環（ENV-BE-1）", () => {
  let databaseUrl: string;
  let prisma: PrismaService;
  let sim: SimulationService;
  let inventory: InventoryService;

  const fieldId = `pb_${LOCAL_PLAYER_ID}_bdef_field`;
  const growMethodId = "method_grow_wheat_default";
  const saveSeedMethodId = "method_save_seed_default";

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    sim = new SimulationService(prisma);
    await sim.refreshConfig();
    inventory = new InventoryService(prisma, sim);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await sim.refreshConfig();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    removeTestDatabase(databaseUrl);
  });

  async function resetField() {
    const b = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    if (!b) return;
    if (b.status === "ready") await inventory.collect(fieldId);
    else if (b.status === "running") await inventory.stop(fieldId);
    await prisma.playerBuilding.update({
      where: { id: fieldId },
      data: { fallowUntilGame: null },
    });
  }

  async function fastReady() {
    const b = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    if (!b || b.status !== "running") return;
    const queue = b.queue as { elapsedGameSec: number; durationGameSec: number }[];
    const job = queue[0];
    if (!job) return;
    await prisma.playerBuilding.update({
      where: { id: fieldId },
      data: {
        status: "ready",
        queue: [{ ...job, elapsedGameSec: job.durationGameSec }],
        bufferedOutputs: { item_wheat: 2, item_straw: 1 },
      },
    });
  }

  it("GET /state 含 environment 與 fallowUntil", async () => {
    await resetField();
    const snap = await inventory.state();
    expect(snap.environment).toMatchObject({
      weather: expect.stringMatching(/^(fair|rain|drought)$/),
      yieldMult: expect.any(Number),
    });
    const field = snap.buildings.find((b) => b.id === fieldId);
    expect(field).toBeDefined();
    expect(field?.fallowUntil).toBeUndefined();
  });

  it("collect 種麥後進休地；休地中 grow start → 400", async () => {
    await resetField();
    await inventory.start(fieldId, growMethodId);
    await fastReady();
    await inventory.collect(fieldId);

    const row = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    const clock = await prisma.serverState.findUniqueOrThrow({ where: { id: 1 } });
    const game = sim.displayGameTime(
      {
        startRealTimeMs: clock.startRealTime.getTime(),
        startGameTime: Number(clock.startGameTime),
      },
      Date.now(),
    );
    const until = Number(row!.fallowUntilGame);
    expect(isFallowActive(until, game)).toBe(true);
    const expectedMin = game + DEFAULT_ENVIRONMENT_CONFIG.fallowDurationGameSec - 2;
    const expectedMax = game + DEFAULT_ENVIRONMENT_CONFIG.fallowDurationGameSec + 2;
    expect(until).toBeGreaterThanOrEqual(expectedMin);
    expect(until).toBeLessThanOrEqual(expectedMax);

    await expect(inventory.start(fieldId, growMethodId)).rejects.toBeInstanceOf(BadRequestException);
    await expect(inventory.start(fieldId, growMethodId)).rejects.toMatchObject({
      response: { message: "土地休耕中" },
    });
  });

  it("休地中仍可 save_seed", async () => {
    await resetField();
    await inventory.start(fieldId, growMethodId);
    await fastReady();
    await inventory.collect(fieldId);
    await inventory.start(fieldId, saveSeedMethodId);
    const running = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(running?.status).toBe("running");
    expect(running?.methodId).toBe(saveSeedMethodId);
  });

  it("stop 未收唔進休地", async () => {
    await resetField();
    await inventory.start(fieldId, growMethodId);
    await inventory.stop(fieldId);
    const row = await prisma.playerBuilding.findUnique({ where: { id: fieldId } });
    expect(row?.fallowUntilGame).toBeNull();
    await inventory.start(fieldId, growMethodId);
  });
});
