import { INestApplication } from "@nestjs/common";
import {
  PLACEHOLDER_DRAW_WATER_OUTPUT_QTY,
  PLACEHOLDER_SAVE_SEED_OUTPUT_QTY,
  PLACEHOLDER_SAVE_SEED_WHEAT_INPUT_QTY,
} from "@ascent/shared";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { SimulationService } from "../src/simulation/simulation.service";
import { createTestApp } from "./test-app";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "./test-db";

/** QA regression for PR #14 — resource loop HTTP behavior */
describe("資源循環 RL-BE-1（QA）", () => {
  let app: INestApplication;
  let databaseUrl: string;
  let prisma: PrismaService;

  const fieldId = "pb_player_local_bdef_field";
  const wellId = "pb_player_local_bdef_well";
  const drawMethod = "method_draw_water_default";
  const saveMethod = "method_save_seed_default";
  const growMethod = "method_grow_wheat_default";

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    seedTestDatabase(databaseUrl);
    const ctx = await createTestApp(databaseUrl);
    app = ctx.app;
    prisma = ctx.moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await app.get(SimulationService).refreshConfig();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (databaseUrl) removeTestDatabase(databaseUrl);
  });

  async function wind(buildingId: string, realSecAgo: number) {
    const past = new Date(Date.now() - realSecAgo * 1000);
    await prisma.playerBuilding.update({
      where: { id: buildingId },
      data: { lastSettledAt: past, lastUpdate: past },
    });
  }

  async function waterQty(): Promise<number> {
    const row = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_water" } },
    });
    return Number(row?.quantity ?? 0);
  }

  it("目錄：7 規則、9 方式；預放 4 座建築含水井", async () => {
    const rules = await request(app.getHttpServer()).get("/api/v1/production-rules").expect(200);
    const methods = await request(app.getHttpServer()).get("/api/v1/production-methods").expect(200);
    expect(rules.body).toHaveLength(7);
    expect(methods.body).toHaveLength(9);
    const buildings = await request(app.getHttpServer()).get("/api/v1/buildings").expect(200);
    const defIds = buildings.body.map((b: { buildingDefId: string }) => b.buildingDefId).sort();
    expect(defIds).toEqual(["bdef_field", "bdef_mill", "bdef_oven", "bdef_well"]);
  });

  it("水井汲水：無扣料 → ready → 收取水 ×5", async () => {
    const before = await waterQty();
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${wellId}/start`)
      .send({ methodId: drawMethod })
      .expect(201);
    expect(await waterQty()).toBe(before);
    await wind(wellId, 15);
    await request(app.getHttpServer()).get(`/api/v1/buildings/${wellId}`).expect(200);
    const building = await prisma.playerBuilding.findUnique({ where: { id: wellId } });
    expect(building!.status).toBe("ready");
    await request(app.getHttpServer()).post(`/api/v1/buildings/${wellId}/collect`).expect(201);
    expect(await waterQty()).toBe(before + PLACEHOLDER_DRAW_WATER_OUTPUT_QTY);
  });

  it("水井拒絕非汲水方式 → 400", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${wellId}/start`)
      .send({ methodId: growMethod })
      .expect(400);
  });

  it("水井連續 collect：201 後第二次 → 400", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${wellId}/start`)
      .send({ methodId: drawMethod })
      .expect(201);
    await wind(wellId, 15);
    await request(app.getHttpServer()).get(`/api/v1/buildings/${wellId}`).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/buildings/${wellId}/collect`).expect(201);
    const second = await request(app.getHttpServer()).post(`/api/v1/buildings/${wellId}/collect`);
    expect(second.status).toBe(400);
  });

  it("田留種：小麥 ×2 → 種子 ×1", async () => {
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
      create: { playerId: "player_local", itemId: "item_wheat", quantity: 10 },
      update: { quantity: 10 },
    });
    const seedBefore = Number(
      (
        await prisma.playerInventory.findUnique({
          where: { playerId_itemId: { playerId: "player_local", itemId: "item_seed_wheat" } },
        })
      )?.quantity ?? 0,
    );
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${fieldId}/start`)
      .send({ methodId: saveMethod })
      .expect(201);
    const wheatRow = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
    });
    expect(Number(wheatRow!.quantity)).toBe(10 - PLACEHOLDER_SAVE_SEED_WHEAT_INPUT_QTY);
    await wind(fieldId, 35);
    await request(app.getHttpServer()).get(`/api/v1/buildings/${fieldId}`).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldId}/collect`).expect(201);
    const seedAfter = Number(
      (
        await prisma.playerInventory.findUnique({
          where: { playerId_itemId: { playerId: "player_local", itemId: "item_seed_wheat" } },
        })
      )?.quantity ?? 0,
    );
    expect(seedAfter).toBe(seedBefore + PLACEHOLDER_SAVE_SEED_OUTPUT_QTY);
  });

  it("水井 stop（D6）：開工後 stop 唔退料、回 idle", async () => {
    const before = await waterQty();
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${wellId}/start`)
      .send({ methodId: drawMethod })
      .expect(201);
    await request(app.getHttpServer()).post(`/api/v1/buildings/${wellId}/stop`).expect(201);
    expect(await waterQty()).toBe(before);
    const building = await prisma.playerBuilding.findUnique({ where: { id: wellId } });
    expect(building!.status).toBe("idle");
  });

  it("水井並發 collect：恰一個 201、水只加一次", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${wellId}/start`)
      .send({ methodId: drawMethod })
      .expect(201);
    await wind(wellId, 15);
    await request(app.getHttpServer()).get(`/api/v1/buildings/${wellId}`).expect(200);
    const before = await waterQty();
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post(`/api/v1/buildings/${wellId}/collect`),
      request(app.getHttpServer()).post(`/api/v1/buildings/${wellId}/collect`),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toContain(201);
    expect(statuses.some((s) => s === 400 || s === 409)).toBe(true);
    expect(await waterQty()).toBe(before + PLACEHOLDER_DRAW_WATER_OUTPUT_QTY);
  });
});
