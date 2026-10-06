import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";
import {
  resolveStaleBuildingActionCode,
  isStaleBuildingActionError,
  STALE_BUILDING_ACTION_CODES,
} from "./stale-building-action";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockResponse(status: number, body: Record<string, unknown> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
  } as Response;
}

describe("resolveStaleBuildingActionCode edge cases (QA @ d2b3eaa)", () => {
  it("falls back to message alias when body.code is not a stale code on HTTP 400", () => {
    expect(
      resolveStaleBuildingActionCode(
        new ApiError("尚無可收取產出", 400, "unrelated_code"),
      ),
    ).toBe(STALE_BUILDING_ACTION_CODES.NOT_READY_TO_COLLECT);
  });

  it("ignores non-string body.code and still resolves alias", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(400, { message: "尚無可收取產出", code: 123 }),
      ),
    );
    await expect(api("/x")).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.code).toBeUndefined();
      expect(resolveStaleBuildingActionCode(e)).toBe(
        STALE_BUILDING_ACTION_CODES.NOT_READY_TO_COLLECT,
      );
      return true;
    });
  });

  it("does not match aliases when array message is joined but differs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(400, { message: ["尚無可收取產出", "其他"] }),
      ),
    );
    await expect(api("/x")).rejects.toSatisfy((err: unknown) => {
      expect(resolveStaleBuildingActionCode(err as ApiError)).toBeNull();
      return true;
    });
  });

  it("treats known stale code on non-400/409 as stale (forward-compatible)", () => {
    expect(
      isStaleBuildingActionError(
        new ApiError("x", 500, STALE_BUILDING_ACTION_CODES.BUSY_OR_READY),
      ),
    ).toBe(true);
  });

  it("handles non-JSON error bodies via statusText", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: () => Promise.reject(new Error("not json")),
      } as Response),
    );
    await expect(api("/x")).rejects.toMatchObject({
      message: "Bad Gateway",
      status: 502,
    });
    await expect(api("/x")).rejects.toSatisfy((err: unknown) => {
      expect(isStaleBuildingActionError(err)).toBe(false);
      return true;
    });
  });
});
