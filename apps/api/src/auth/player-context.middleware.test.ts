import "reflect-metadata";
import { Controller, Get, type INestApplication, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { signSession } from "./jwt";
import { PlayerContextMiddleware } from "./player-context.middleware";
import { currentPlayerId } from "./player-context";

@Controller("api/v1/auth")
class ProbeController {
  @Get("me")
  async me(): Promise<{ sync: string; afterAwait: string }> {
    const sync = currentPlayerId();
    await Promise.resolve();
    return { sync, afterAwait: currentPlayerId() };
  }
}

@Module({
  controllers: [ProbeController],
  providers: [PlayerContextMiddleware],
})
class ProbeModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(PlayerContextMiddleware).forRoutes(ProbeController);
  }
}

describe("玩家上下文中介層", () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await NestFactory.create(ProbeModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === "object" && address ? address.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("帶著別的玩家憑證時，路由在 await 之後仍是該玩家，不會退回單機存檔", async () => {
    const token = signSession({ sub: "player_miller", accountId: "acct_miller", username: "miller" });
    const res = await fetch(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sync: string; afterAwait: string };
    expect(body.sync).toBe("player_miller");
    expect(body.afterAwait).toBe("player_miller");
    expect(body.sync).not.toBe(LOCAL_PLAYER_ID);
  });
});
