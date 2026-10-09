import { HttpException, type ExecutionContext } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { resetWriteThrottleBuckets, WriteThrottleGuard } from "./write-throttle.guard";

function mockCtx(method: string, path: string, ip = "203.0.113.8"): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        url: path,
        ip,
        socket: { remoteAddress: ip },
      }),
    }),
  } as ExecutionContext;
}

describe("WriteThrottleGuard", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevThrottle = process.env.ASCENT_THROTTLE;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevThrottle === undefined) delete process.env.ASCENT_THROTTLE;
    else process.env.ASCENT_THROTTLE = prevThrottle;
    resetWriteThrottleBuckets();
  });

  it("NODE_ENV=test 時跳過", () => {
    process.env.NODE_ENV = "test";
    delete process.env.ASCENT_THROTTLE;
    const guard = new WriteThrottleGuard();
    for (let i = 0; i < 20; i++) {
      expect(guard.canActivate(mockCtx("POST", "/api/v1/auth/login"))).toBe(true);
    }
  });

  it("登入超過每分鐘 8 次回 429", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ASCENT_THROTTLE;
    const guard = new WriteThrottleGuard();
    for (let i = 0; i < 8; i++) {
      expect(guard.canActivate(mockCtx("POST", "/api/v1/auth/login"))).toBe(true);
    }
    expect(() => guard.canActivate(mockCtx("POST", "/api/v1/auth/login"))).toThrow(HttpException);
  });

  it("PATCH 建築寫入也計入限速", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ASCENT_THROTTLE;
    const guard = new WriteThrottleGuard();
    const path = "/api/v1/buildings/pb_1/auto";
    for (let i = 0; i < 40; i++) {
      expect(guard.canActivate(mockCtx("PATCH", path))).toBe(true);
    }
    expect(() => guard.canActivate(mockCtx("PATCH", path))).toThrow(HttpException);
  });
});
