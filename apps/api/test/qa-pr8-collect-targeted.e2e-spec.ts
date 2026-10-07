/**
 * QA PR #8 @ a5a03c5 — 針對性 collect 200/409、並發與 cron 回歸。
 */
import { INestApplication } from "@nestjs/common";
import request, { type Response } from "supertest";
import { BUILDING_STATE_CONFLICT_MESSAGE } from "../src/inventory/building-state-update";
import { SettlementCronService } from "../src/inventory/settlement-cron.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { SimulationService } from "../src/simulation/simulation.service";
import { createTestApp } from "./test-app";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "./test-db";

function countStatus(results: { status: number }[], code: number): number {
  return results.filter((r) => r.status === code).length;
}

describe("QA PR#8 collect 針對性 e2e", () => {
  jest.setTimeout(120_000);

  const fieldBuildingId = "pb_player_local_bdef_field";
  const growMethodId = "method_grow_wheat_default";
  const missingBuildingId = "pb_player_local_missing_qa";

  describe("預設（無背景 cron 排程）", () => {
    let app: INestApplication;
    let databaseUrl: string;
    let prisma: PrismaService;

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

    it("(a) 連續 collect：200 後 409，小麥只入帳一次", async () => {
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

    it("(c) idle / running collect → 409；不存在建築 → 404；collect 永不回 400", async () => {
      const idle = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(idle.status).toBe(409);
      expect(idle.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
      expect(idle.status).not.toBe(400);

      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      const running = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(running.status).toBe(409);
      expect(running.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
      expect(running.status).not.toBe(400);

      const missing = await request(app.getHttpServer()).post(`/api/v1/buildings/${missingBuildingId}/collect`);
      expect(missing.status).toBe(404);
      expect(missing.status).not.toBe(400);

      const wheatBefore = await wheatQuantity();
      expect(wheatBefore).toBe(0);
    });

    it("(d) 成功 collect 回 200 且 body 形狀正確", async () => {
      await readyToCollect();
      const res = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: fieldBuildingId,
        status: "idle",
        methodId: null,
      });
      expect(res.body.buildingDef).toBeDefined();
      expect(res.body.method).toBeNull();
      expect(res.body.queue).toEqual([]);
      expect(res.body.bufferedOutputs).toEqual({});
    });

    it("(e) idle 上 POST stop 仍回 201 no-op", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/stop`)
        .expect(201);
      expect(res.body.status).toBe("idle");
    });
  });

  describe("啟用真實 coarseTick 排程", () => {
    let app: INestApplication;
    let databaseUrl: string;
    let prisma: PrismaService;
    let cron: SettlementCronService;

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
      cron.pauseBackgroundTicksForTests();
      if (app) await app.close();
      if (databaseUrl) removeTestDatabase(databaseUrl);
    });

    async function prepareReadyBuilding() {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      const past = new Date(Date.now() - 120_000);
      await prisma.playerBuilding.update({
        where: { id: fieldBuildingId },
        data: { lastSettledAt: past, lastUpdate: past },
      });
      await request(app.getHttpServer()).get(`/api/v1/buildings/${fieldBuildingId}`).expect(200);
      const b = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      expect(b!.status).toBe("ready");
    }

    async function wheatQuantity(): Promise<number> {
      const row = await prisma.playerInventory.findUnique({
        where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
      });
      return row ? Number(row.quantity) : 0;
    }

    async function assertSingleCollectWinner(results: { status: number }[], beforeWheat: number) {
      expect(countStatus(results, 200)).toBe(1);
      expect(countStatus(results, 409)).toBe(results.length - 1);
      for (const r of results) {
        expect(r.status).not.toBe(400);
      }
      const after = await wheatQuantity();
      expect(after - beforeWheat).toBe(2);
      const building = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      expect(building!.status).toBe("idle");
      expect(building!.bufferedOutputs).toEqual({});
      expect(building!.queue).toEqual([]);
    }

    it("(b) 並發 2-way collect + coarseTick：恰一 200 其餘 409", async () => {
      await prepareReadyBuilding();
      const before = await wheatQuantity();
      const [a, b] = await Promise.all([
        request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
        request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
        cron.coarseTick(),
      ]);
      await assertSingleCollectWinner([a, b], before);
    });

    it("(b) 並發 5-way collect + coarseTick：恰一 200 其餘 409", async () => {
      await prepareReadyBuilding();
      const before = await wheatQuantity();
      const collects = Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      );
      const settled: (Response | void)[] = await Promise.all([
        ...collects,
        cron.coarseTick(),
        cron.coarseTick(),
      ]);
      const collectOnly = settled.filter((r): r is Response => r !== undefined && typeof r === "object" && "status" in r);
      expect(collectOnly.length).toBe(5);
      await assertSingleCollectWinner(collectOnly, before);
    });
  });
});
