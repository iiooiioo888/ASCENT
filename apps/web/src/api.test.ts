import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

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

describe("api", () => {
  it("treats HTTP 200 and 201 collect responses as success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(200, { id: "pb_field", status: "idle" }))
      .mockResolvedValueOnce(mockResponse(201, { id: "pb_field", status: "idle" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api("/api/v1/buildings/pb_field/collect")).resolves.toMatchObject({ status: "idle" });
    await expect(api("/api/v1/buildings/pb_field/collect")).resolves.toMatchObject({ status: "idle" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws ApiError with status 400 when collect has nothing to claim (main backend)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(400, {
          statusCode: 400,
          message: "尚無可收取產出",
          error: "Bad Request",
        }),
      ),
    );

    await expect(api("/api/v1/buildings/pb_field/collect")).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).message).toBe("尚無可收取產出");
      return true;
    });
  });

  it("throws ApiError with status 409 on concurrent collect (post–PR #8 backend)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(409, {
          statusCode: 409,
          message: "建築狀態已變更，請重新整理",
          error: "Conflict",
        }),
      ),
    );

    await expect(api("/api/v1/buildings/pb_field/collect")).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(409);
      return true;
    });
  });
});
