import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { createEmptyTestDatabase, removeTestDatabase, seedTestDatabase } from "../../test/test-db";

describe("登入（F1）", () => {
  let databaseUrl: string;
  let base: string;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    process.env.ASCENT_REQUIRE_AUTH = "1";
    (BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function toJSON() {
      return this.toString();
    };
    databaseUrl = createEmptyTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    seedTestDatabase(databaseUrl);
    const app: INestApplication = await NestFactory.create(AppModule, { logger: false });
    prisma = app.get(PrismaService);
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === "object" && address ? address.port : 0;
    base = `http://127.0.0.1:${port}`;
    close = () => app.close();
  });

  beforeEach(() => {
    seedTestDatabase(databaseUrl);
  });

  afterAll(async () => {
    if (close) await close();
    if (databaseUrl) removeTestDatabase(databaseUrl);
    delete process.env.ASCENT_REQUIRE_AUTH;
  });

  it("未帶憑證不能讀世界；第一個帳號接上單機存檔，進頁結算仍走原入口", async () => {
    const anon = await fetch(`${base}/api/v1/state`);
    expect(anon.status).toBe(401);

    const registered = await fetch(`${base}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "farmer", password: "field-water" }),
    });
    expect(registered.status).toBe(201);
    const session = (await registered.json()) as {
      token: string;
      accessToken?: string;
      refreshToken: string;
      playerId: string;
      adoptedExistingWorld: boolean;
    };
    expect(session.playerId).toBe(LOCAL_PLAYER_ID);
    expect(session.adoptedExistingWorld).toBe(true);
    expect(session.refreshToken).toBeTruthy();
    expect(session.accessToken ?? session.token).toBeTruthy();

    const rotated = await fetch(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    expect(rotated.status).toBe(201);
    const nextSession = (await rotated.json()) as { token: string; refreshToken: string };
    expect(nextSession.refreshToken).not.toBe(session.refreshToken);

    const reused = await fetch(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    expect(reused.status).toBe(401);

    const state = await fetch(`${base}/api/v1/state`, {
      headers: { Authorization: `Bearer ${nextSession.token}` },
    });
    expect(state.status).toBe(200);
    const body = (await state.json()) as { inventory: unknown };
    expect(body.inventory).toBeTruthy();

    const invBefore = await prisma.playerInventory.findMany({
      where: { playerId: LOCAL_PLAYER_ID },
    });
    const buildingsBefore = await prisma.playerBuilding.count({
      where: { playerId: LOCAL_PLAYER_ID },
    });
    expect(invBefore.length).toBeGreaterThan(0);
    expect(buildingsBefore).toBeGreaterThan(0);

    const again = await fetch(`${base}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "miller", password: "field-water" }),
    });
    expect(again.status).toBe(409);
    const conflict = (await again.json()) as { message: string };
    expect(conflict.message).toContain("主線存檔已存在");

    expect(await prisma.player.count()).toBe(1);
    expect(await prisma.account.count()).toBe(1);

    const invAfter = await prisma.playerInventory.findMany({
      where: { playerId: LOCAL_PLAYER_ID },
    });
    const buildingsAfter = await prisma.playerBuilding.count({
      where: { playerId: LOCAL_PLAYER_ID },
    });
    expect(invAfter).toEqual(invBefore);
    expect(buildingsAfter).toBe(buildingsBefore);
  });
});
