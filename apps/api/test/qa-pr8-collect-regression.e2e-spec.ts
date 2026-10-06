/**
 * PR #8 QA 加測：collect 200/409、文檔開工範例、idle stop 201 no-op。
 */
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { BUILDING_STATE_CONFLICT_MESSAGE } from "../src/inventory/building-state-update";
import { SettlementCronService } from "../src/inventory/settlement-cron.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { SimulationService } from "../src/simulation/simulation.service";
import { createTestApp } from "./test-app";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "./test-db";

describe("QA PR#8 collect / start / stop 回歸", () => {
  jest.setTimeout(120_000);

  let app: INestApplication;
  let databaseUrl: string;
  let prisma: PrismaService;
  let cron: SettlementCronService;

  const fieldBuildingId = "pb_player_local_bdef_field";
  const growMethodId = "method_grow_wheat_default";

  beforeAll(async () => {
    databaseUrl = createEmptyTestDatabase();
    seedTestDatabase(databaseUrl);
    const ctx = await createTestApp(databaseUrl, { enableSettlementCron: true });
    app = ctx.app;
    prisma = ctx.moduleRef.get(PrismaService);
    cron = ctx.moduleRef.get(SettlementCronService);
  });

  beforeEach(async () => {
    seedTestDatabase(databaseUrl);
    await app.get(SimulationService).refreshConfig();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (databaseUrl) removeTestDatabase(databaseUrl);
  });

  async function windBuildingBack(buildingId: string, realSecAgo: number) {
    const past = new Date(Date.now() - realSecAgo * 1000);
    await prisma.playerBuilding.update({
      where: { id: buildingId },
      data: { lastSettledAt: past, lastUpdate: past },
    });
  }

  async function wheatQuantity(): Promise<number> {
    const row = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
    });
    return row ? Number(row.quantity) : 0;
  }

  async function readyToCollect() {
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${fieldBuildingId}/start`)
      .send({ methodId: growMethodId })
      .expect(201);
    await windBuildingBack(fieldBuildingId, 90);
    await request(app.getHttpServer()).get(`/api/v1/buildings/${fieldBuildingId}`).expect(200);
    const b = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
    expect(b!.status).toBe("ready");
  }

  it("文檔開工範例（農業種子 method_grow_wheat_default）對 seeded 目錄可 201 開工", async () => {
    const method = await prisma.productionMethod.findUnique({ where: { id: growMethodId } });
    expect(method).not.toBeNull();
    const building = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
    expect(building).not.toBeNull();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/buildings/${fieldBuildingId}/start`)
      .send({ methodId: growMethodId });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("running");
    expect(res.body.methodId).toBe(growMethodId);
  });

  it("連續兩次 collect：200 後 409，庫存只入帳一次", async () => {
    await readyToCollect();
    const before = await wheatQuantity();
    await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`).expect(200);
    const mid = await wheatQuantity();
    expect(mid - before).toBe(2);

    const second = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
    expect(second.status).toBe(409);
    expect(second.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
    expect(await wheatQuantity()).toBe(mid);
  });

  it("並發 5 次 collect（含 coarseTick）：恰一 200、四 409，庫存只 +2", async () => {
    await readyToCollect();
    const before = await wheatQuantity();

    const calls = [
      request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      cron.coarseTick(),
    ];
    const results = await Promise.all(calls);
    const collectResults = results.slice(0, 5) as { status: number }[];

    const ok = collectResults.filter((r) => r.status === 200);
    const conflict = collectResults.filter((r) => r.status === 409);
    expect(ok.length).toBe(1);
    expect(conflict.length).toBe(4);
    expect(await wheatQuantity()).toBe(before + 2);

    const building = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
    expect(building!.status).toBe("idle");
    expect(Object.keys(building!.bufferedOutputs as object).length).toBe(0);
  });

  it("idle / running 上 collect → 409", async () => {
    const idle = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
    expect(idle.status).toBe(409);

    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${fieldBuildingId}/start`)
      .send({ methodId: growMethodId })
      .expect(201);
    const running = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
    expect(running.status).toBe(409);
    expect(running.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
  });

  it("不存在建築 collect → 404", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/buildings/pb_missing/collect");
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("建築不存在");
  });

  it("idle 上 stop → 201 no-op（狀態與庫存不變）", async () => {
    const beforeBuilding = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
    expect(beforeBuilding!.status).toBe("idle");
    const beforeInv = await wheatQuantity();

    const res = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/stop`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("idle");
    expect(res.body.methodId).toBeNull();

    const afterBuilding = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
    expect(afterBuilding!.status).toBe("idle");
    expect(afterBuilding!.methodId).toBeNull();
    expect(await wheatQuantity()).toBe(beforeInv);
  });
});
