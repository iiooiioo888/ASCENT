/**
 * QA regression（PR #8 @ d6d4e68）— 不屬 PR 分支，僅 qa/pr-8-d6d4e68。
 */
import { INestApplication } from "@nestjs/common";
import request, { type Response } from "supertest";
import { BUILDING_STATE_CONFLICT_MESSAGE } from "../src/inventory/building-state-update";
import { SettlementCronService } from "../src/inventory/settlement-cron.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { SimulationService } from "../src/simulation/simulation.service";
import { createTestApp } from "./test-app";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "./test-db";

describe("QA PR#8 collect 回歸", () => {
  jest.setTimeout(120_000);

  const fieldBuildingId = "pb_player_local_bdef_field";
  const growMethodId = "method_grow_wheat_default";

  describe("預設測試 app（cron mock 暫停）", () => {
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

    async function wheatQty(): Promise<number> {
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
      const past = new Date(Date.now() - 90_000);
      await prisma.playerBuilding.update({
        where: { id: fieldBuildingId },
        data: { lastSettledAt: past, lastUpdate: past },
      });
      await request(app.getHttpServer()).get(`/api/v1/buildings/${fieldBuildingId}`).expect(200);
    }

    it("連續兩次 collect：庫存只加一次", async () => {
      await readyToCollect();
      const before = await wheatQty();
      await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`).expect(200);
      const mid = await wheatQty();
      expect(mid - before).toBe(2);
      const second = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(second.status).toBe(409);
      expect(await wheatQty()).toBe(mid);
    });

    it("idle / running collect → 409；不存在 → 404", async () => {
      const idle = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(idle.status).toBe(409);
      expect(idle.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);

      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      const running = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(running.status).toBe(409);

      const missing = await request(app.getHttpServer()).post("/api/v1/buildings/pb_missing/collect");
      expect(missing.status).toBe(404);
      expect(missing.body.message).toContain("建築不存在");
    });

    it("成功 collect 200 body 形狀（idle 建築 + relations）", async () => {
      await readyToCollect();
      const res = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: fieldBuildingId,
        playerId: "player_local",
        buildingDefId: "bdef_field",
        status: "idle",
        methodId: null,
      });
      expect(res.body.buildingDef).toMatchObject({ id: "bdef_field" });
      expect(res.body.method).toBeNull();
      expect(res.body.bufferedOutputs).toEqual({});
      expect(res.body.queue).toEqual([]);
    });
  });

  describe("啟用真實 coarseTick", () => {
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
      if (app) await app.close();
      if (databaseUrl) removeTestDatabase(databaseUrl);
    });

    async function wheatQty(): Promise<number> {
      const row = await prisma.playerInventory.findUnique({
        where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
      });
      return row ? Number(row.quantity) : 0;
    }

    it("6 路並發 collect + coarseTick：恰一個 200、其餘 409；庫存 +2", async () => {
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

      const before = await wheatQty();
      const httpPromises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      );
      const [httpResults] = await Promise.all([Promise.all(httpPromises), cron.coarseTick()]);
      const statuses = httpResults.map((r: Response) => r.status).sort((a, b) => a - b);
      expect(statuses.filter((s) => s === 200)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(4);
      expect(await wheatQty() - before).toBe(2);
      const building = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      expect(building!.status).toBe("idle");
      expect(Object.keys(building!.bufferedOutputs as object)).toHaveLength(0);
    });
  });
});
