import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { BUILDING_STATE_CONFLICT_MESSAGE } from "../src/inventory/building-state-update";
import { PrismaService } from "../src/prisma/prisma.service";
import { SimulationService } from "../src/simulation/simulation.service";
import { createTestApp } from "./test-app";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "./test-db";

function expectCollectSuccessAndConflict(a: { status: number }, b: { status: number }) {
  const statuses = [a.status, b.status].sort((x, y) => x - y);
  expect(statuses).toEqual([200, 409]);
}

describe("POST collect HTTP 語意（200 / 409）", () => {
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

  async function readyToCollect() {
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${fieldBuildingId}/start`)
      .send({ methodId: growMethodId })
      .expect(201);
    await windBuildingBack(fieldBuildingId, 90);
    await request(app.getHttpServer()).get(`/api/v1/buildings/${fieldBuildingId}`).expect(200);
  }

  it("非 ready collect → 409", async () => {
    const res = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
  });

  it("連續兩次 collect：200 後第二次 → 409", async () => {
    await readyToCollect();
    await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`).expect(200);
    const second = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
    expect(second.status).toBe(409);
    expect(second.body.message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
  });

  it("並發兩次 collect：200 與 409 各一", async () => {
    await readyToCollect();
    const building = await prisma.playerBuilding.findUniqueOrThrow({ where: { id: fieldBuildingId } });
    const buffered = building.bufferedOutputs as Record<string, number>;
    const wheatBuffered = buffered.item_wheat ?? 0;
    expect(wheatBuffered).toBeGreaterThan(0);

    const invBefore = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
    });
    const qtyBefore = invBefore ? Number(invBefore.quantity) : 0;

    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
      request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`),
    ]);
    expectCollectSuccessAndConflict(a, b);

    const invAfter = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId: "item_wheat" } },
    });
    expect(Number(invAfter?.quantity ?? 0)).toBe(qtyBefore + wheatBuffered);
  });

  it("成功 collect 回 200（非 201）", async () => {
    await readyToCollect();
    const res = await request(app.getHttpServer()).post(`/api/v1/buildings/${fieldBuildingId}/collect`);
    expect(res.status).toBe(200);
  });
});
