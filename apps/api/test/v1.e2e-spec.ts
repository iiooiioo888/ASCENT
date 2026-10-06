import { INestApplication } from "@nestjs/common";
import { GAME_CONFIG, MAX_OFFLINE_REAL_SEC, TIME_SCALE } from "@ascent/shared";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { SimulationService } from "../src/simulation/simulation.service";
import { BUILDING_STATE_CONFLICT_MESSAGE } from "../src/inventory/building-state-update";
import { createTestApp } from "./test-app";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "./test-db";
function expectOneOkOneConflict(a: { status: number }, b: { status: number }) {
  const statuses = [a.status, b.status].sort((x, y) => x - y);
  expect(statuses).toEqual([200, 409]);
}

async function readyToCollect(
  app: INestApplication,
  windBuildingBack: (id: string, sec: number) => Promise<void>,
  buildingId: string,
  methodId: string,
) {
  await request(app.getHttpServer())
    .post(`/api/v1/buildings/${buildingId}/start`)
    .send({ methodId })
    .expect(201);
  await windBuildingBack(buildingId, 90);
  await request(app.getHttpServer()).get(`/api/v1/buildings/${buildingId}`).expect(200);
}

describe("API v1（整合）", () => {
  let app: INestApplication;
  let databaseUrl: string;
  let prisma: PrismaService;

  const fieldBuildingId = "pb_player_local_bdef_field";
  const growMethodId = "method_grow_wheat_default";

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

  describe("GET /api/v1/time", () => {
    it("回傳時鐘欄位且 timeScale=60", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/time").expect(200);
      expect(res.body).toMatchObject({
        startGameTime: 0,
        timeScale: TIME_SCALE,
      });
      expect(res.body.startRealTime).toBeDefined();
      expect(res.body.serverRealTime).toBeDefined();
      expect(typeof res.body.displayGameTime).toBe("number");
    });

    it("不觸發懶結算（lastSettledAt 不變）", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);

      await windBuildingBack(fieldBuildingId, 120);
      const before = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      await request(app.getHttpServer()).get("/api/v1/time").expect(200);
      const after = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      expect(after!.lastSettledAt.toISOString()).toBe(before!.lastSettledAt.toISOString());
      expect(after!.status).toBe("running");
    });
  });

  describe("目錄", () => {
    it("GET /item-types 回傳已啟用類型", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/item-types").expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((t: { isActive: boolean }) => t.isActive)).toBe(true);
    });

    it("GET /item-properties 回傳屬性定義", async () => {
      await prisma.itemProperty.create({
        data: {
          id: "prop_purity",
          code: "purity",
          name: "純度",
          valueKind: "number",
          isActive: true,
          releasedInVersion: "mvp",
        },
      });
      const res = await request(app.getHttpServer()).get("/api/v1/item-properties").expect(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "prop_purity", code: "purity", valueKind: "number" }),
        ]),
      );
    });

    it("GET /items 可依 layer 過濾", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/items?layer=T").expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((i: { layer: string }) => i.layer === "T")).toBe(true);
    });

    it("GET /items/:id 單筆", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/items/item_wheat").expect(200);
      expect(res.body).toMatchObject({ id: "item_wheat", code: "wheat" });
    });
  });

  describe("規則", () => {
    it("GET /production-rules 與 /production-methods", async () => {
      const rules = await request(app.getHttpServer()).get("/api/v1/production-rules").expect(200);
      expect(rules.body.length).toBeGreaterThan(0);
      const methods = await request(app.getHttpServer()).get("/api/v1/production-methods").expect(200);
      expect(methods.body.length).toBeGreaterThan(0);
    });

    it("GET /production-methods/:id 含 ruleId", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/production-methods/${growMethodId}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: growMethodId,
        ruleId: "rule_grow_wheat",
      });
    });

    it("GET /loops", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/loops").expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/v1/validate", () => {
    it("種子資料通過驗證（game_config 自 DB）", async () => {
      const res = await request(app.getHttpServer()).post("/api/v1/validate").expect(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.errors).toEqual([]);
      expect(res.body.generatedPreview.length).toBeGreaterThan(0);
    });

    it("maxOfflineRealSec 錯誤時回傳 V-OFFLINE", async () => {
      await prisma.gameConfig.update({
        where: { id: 1 },
        data: { maxOfflineRealSec: 86400 },
      });
      const res = await request(app.getHttpServer()).post("/api/v1/validate").expect(201);
      expect(res.body.ok).toBe(false);
      expect(res.body.errors.some((e: { code: string }) => e.code === "V-OFFLINE")).toBe(true);
    });

    it("gameDayGameSec 錯誤時回傳 V-OFFLINE", async () => {
      await prisma.gameConfig.update({
        where: { id: 1 },
        data: { gameDayGameSec: 1 },
      });
      const res = await request(app.getHttpServer()).post("/api/v1/validate").expect(201);
      expect(res.body.ok).toBe(false);
      expect(res.body.errors.some((e: { message: string }) => e.message.includes("gameDayGameSec"))).toBe(
        true,
      );
    });

    it("tickIntervalRealMs 錯誤時回傳 V-OFFLINE", async () => {
      await prisma.gameConfig.update({
        where: { id: 1 },
        data: { tickIntervalRealMs: 999 },
      });
      const res = await request(app.getHttpServer()).post("/api/v1/validate").expect(201);
      expect(res.body.ok).toBe(false);
      expect(res.body.errors.some((e: { message: string }) => e.message.includes("tickIntervalRealMs"))).toBe(
        true,
      );
    });
  });

  describe("懶結算與庫存", () => {
    it("GET /inventory 會結算進行中的生產", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      await windBuildingBack(fieldBuildingId, 90);
      await request(app.getHttpServer()).get("/api/v1/inventory").expect(200);
      const building = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      expect(building!.status).toBe("ready");
      const buffered = building!.bufferedOutputs as Record<string, number>;
      expect(buffered.item_wheat).toBe(2);
    });

    it("GET /state 含結算後建築", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      await windBuildingBack(fieldBuildingId, 90);
      const res = await request(app.getHttpServer()).get("/api/v1/state").expect(200);
      expect(res.body.time).toBeDefined();
      expect(res.body.buildings.some((b: { id: string }) => b.id === fieldBuildingId)).toBe(true);
    });

    it("離線補算受 8 現實小時 cap 限制（產能冪等）", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      const tenHoursSec = 10 * 3600;
      await windBuildingBack(fieldBuildingId, tenHoursSec);
      await request(app.getHttpServer()).get(`/api/v1/buildings/${fieldBuildingId}`).expect(200);
      const once = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      expect(once!.status).toBe("ready");
      const bufferedOnce = once!.bufferedOutputs as Record<string, number>;
      expect(bufferedOnce.item_wheat).toBe(2);

      await request(app.getHttpServer()).get(`/api/v1/buildings/${fieldBuildingId}`).expect(200);
      const twice = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      const bufferedTwice = twice!.bufferedOutputs as Record<string, number>;
      expect(bufferedTwice).toEqual(bufferedOnce);
      expect(MAX_OFFLINE_REAL_SEC).toBe(28800);
    });

    it("POST collect 發放 buffered 產出", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      await windBuildingBack(fieldBuildingId, 90);
      await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`).expect(200);
      const inv = await prisma.playerInventory.findUnique({
        where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
      });
      expect(Number(inv!.quantity)).toBe(2);
    });
  });

  describe("建築寫入與錯誤路徑", () => {
    it("POST /buildings 放置建築", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/buildings")
        .send({ buildingDefId: "bdef_silo" })
        .expect(201);
      expect(res.body.buildingDefId).toBe("bdef_silo");
    });

    it("POST start 資源不足 → 400", async () => {
      await prisma.playerInventory.updateMany({
        where: { playerId: "player_local" },
        data: { quantity: 0 },
      });
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(400);
    });

    it("POST start 未知方式 → 400", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: "method_nope" })
        .expect(400);
    });

    it("POST start 於倉庫（allowed_rule_ids 為空）→ 400", async () => {
      const placed = await request(app.getHttpServer())
        .post("/api/v1/buildings")
        .send({ buildingDefId: "bdef_silo" })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${placed.body.id}/start`)
        .send({ methodId: growMethodId })
        .expect(400);
    });

    it("GET 不存在建築 → 404", async () => {
      await request(app.getHttpServer()).get("/api/v1/buildings/pb_missing").expect(404);
    });

    it("POST collect 非 ready → 409（狀態衝突）", async () => {
      const res = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(res.status).toBe(409);
      expect(res.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
    });

    it("連續兩次 POST collect：200 後第二次 → 409", async () => {
      await readyToCollect(app, windBuildingBack, fieldBuildingId, growMethodId);
      await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`).expect(200);
      const second = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
      expect(second.status).toBe(409);
      expect(second.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
    });

    it("並發兩次 POST collect 於 ready 建築：200 與 409 各一", async () => {
      await readyToCollect(app, windBuildingBack, fieldBuildingId, growMethodId);
      const [a, b] = await Promise.all([
        request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
        request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      ]);
      expectOneOkOneConflict(a, b);
    });

    it("POST place 未知建築 → 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/buildings")
        .send({ buildingDefId: "bdef_nope" })
        .expect(400);
    });

    it("POST stop 可停止運行中建築", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      const res = await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/stop`)
        .expect(201);
      expect(res.body.status).toBe("idle");
    });
  });

  describe("game_config 載入", () => {
    it("SimulationService 使用 DB 中的 game_config", async () => {
      const simulation = app.get(SimulationService);
      expect(simulation.config).toMatchObject({
        timeScale: GAME_CONFIG.timeScale,
        maxOfflineRealSec: GAME_CONFIG.maxOfflineRealSec,
      });
    });
  });
});
