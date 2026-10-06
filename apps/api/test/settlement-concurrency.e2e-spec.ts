/**
 * SettlementMutex 下，背景 coarseTick 與 HTTP 懶結算／collect 應互斥、不得雙重入帳。
 * 此檔啟用真實 SettlementCronService 並並發呼叫 coarseTick（非依賴排程器）。
 */
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { SettlementCronService } from "../src/inventory/settlement-cron.service";
import { SimulationService } from "../src/simulation/simulation.service";
import { createTestApp } from "./test-app";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "./test-db";

describe("結算並發（cron × HTTP）", () => {
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

  /** coarseTick 在 NODE_ENV=test 時為 no-op；並發測試需暫時脫離 test 環境。 */
  async function runCoarseTick() {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      await cron.coarseTick();
    } finally {
      process.env.NODE_ENV = prev;
    }
  }

  async function wheatQuantity(): Promise<number> {
    const row = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
    });
    return row ? Number(row.quantity) : 0;
  }

  it(
    "cron coarseTick 與 POST collect 並發不得雙重收取小麥（多輪擾動）",
    async () => {
      for (let round = 0; round < 8; round++) {
        seedTestDatabase(databaseUrl);
        await app.get(SimulationService).refreshConfig();
        await prepareReadyBuilding();
        const before = await wheatQuantity();

        await Promise.all([
          runCoarseTick(),
          request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`).expect(200),
          runCoarseTick(),
          request(app.getHttpServer()).get("/api/v1/inventory").expect(200),
        ]);

        const after = await wheatQuantity();
        expect(after - before).toBeLessThanOrEqual(2);
        const building = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
        expect(building!.status).not.toBe("ready");
        const buffered = building!.bufferedOutputs as Record<string, number>;
        expect(Object.keys(buffered).length).toBe(0);
      }
    },
  );

  it(
    "cron coarseTick 與 GET 懶結算並發不得讓 buffered 產出重複累加",
    async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/buildings/${fieldBuildingId}/start`)
        .send({ methodId: growMethodId })
        .expect(201);
      const past = new Date(Date.now() - 120_000);
      await prisma.playerBuilding.update({
        where: { id: fieldBuildingId },
        data: { lastSettledAt: past, lastUpdate: past },
      });

      await Promise.all([
        runCoarseTick(),
        request(app.getHttpServer()).get("/api/v1/inventory").expect(200),
        runCoarseTick(),
        request(app.getHttpServer()).get(`/api/v1/buildings/${fieldBuildingId}`).expect(200),
      ]);

      const building = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      const buffered = building!.bufferedOutputs as Record<string, number>;
      expect(buffered.item_wheat ?? 0).toBeLessThanOrEqual(2);
    },
  );

  it(
    "collect 完成後 cron 不得把建築寫回 ready 並恢復 buffer",
    async () => {
      await prepareReadyBuilding();
      await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`).expect(200);
      await runCoarseTick();
      const building = await prisma.playerBuilding.findUnique({ where: { id: fieldBuildingId } });
      expect(building!.status).toBe("idle");
      const buffered = building!.bufferedOutputs as Record<string, number>;
      expect(Object.keys(buffered).length).toBe(0);
    },
  );
});
