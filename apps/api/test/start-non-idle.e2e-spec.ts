import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { SimulationService } from "../src/simulation/simulation.service";
import { createTestApp } from "./test-app";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "./test-db";

describe("POST start 非 idle 守衛", () => {
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

  async function inventoryQty(itemId: string): Promise<number> {
    const row = await prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: "player_local", itemId } },
    });
    return row ? Number(row.quantity) : 0;
  }

  it("running 時 POST start → 400 且不扣輸入", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/buildings/${fieldBuildingId}/start`)
      .send({ methodId: growMethodId })
      .expect(201);

    const seedBefore = await inventoryQty("item_seed_wheat");
    const waterBefore = await inventoryQty("item_water");

    const res = await request(app.getHttpServer())
      .post(`/api/v1/buildings/${fieldBuildingId}/start`)
      .send({ methodId: growMethodId });
    expect(res.status).toBe(400);
    expect(String(res.body.message)).toContain("忙碌");

    expect(await inventoryQty("item_seed_wheat")).toBe(seedBefore);
    expect(await inventoryQty("item_water")).toBe(waterBefore);
  });

  it("ready 待收取時 POST start → 400 且不扣輸入", async () => {
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
    const building = await prisma.playerBuilding.findUniqueOrThrow({ where: { id: fieldBuildingId } });
    expect(building.status).toBe("ready");

    const seedBefore = await inventoryQty("item_seed_wheat");
    const waterBefore = await inventoryQty("item_water");

    const res = await request(app.getHttpServer())
      .post(`/api/v1/buildings/${fieldBuildingId}/start`)
      .send({ methodId: growMethodId });
    expect(res.status).toBe(400);

    expect(await inventoryQty("item_seed_wheat")).toBe(seedBefore);
    expect(await inventoryQty("item_water")).toBe(waterBefore);
  });
});
