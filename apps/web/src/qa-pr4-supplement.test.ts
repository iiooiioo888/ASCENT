import { describe, expect, it, vi, afterEach } from "vitest";
import { api, ApiError } from "./api";
import {
  BUILDING_ACTION_ERROR_CODES,
  BUILDING_ACTION_ERROR_COPY,
  mapBuildingActionError,
} from "./building-action-error";
import { formatQuantity } from "./format";

afterEach(() => vi.unstubAllGlobals());

describe("QA PR#4 supplement — api resilience", () => {
  it("handles non-JSON error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      } as Response),
    );
    await expect(api("/x")).rejects.toMatchObject({ status: 500, message: "Internal Server Error" });
  });

  it("surfaces network failures from fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api("/x")).rejects.toBeInstanceOf(TypeError);
  });
});

describe("QA PR#4 supplement — mapper edge cases", () => {
  it("maps building_busy_or_ready by code", () => {
    expect(
      mapBuildingActionError(new ApiError("m", 400, BUILDING_ACTION_ERROR_CODES.BUILDING_BUSY_OR_READY)),
    ).toMatchObject({ message: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED, shouldRefresh: true });
  });

  it("maps 404 building_not_found by code", () => {
    expect(
      mapBuildingActionError(new ApiError("m", 404, BUILDING_ACTION_ERROR_CODES.BUILDING_NOT_FOUND)).message,
    ).toBe(BUILDING_ACTION_ERROR_COPY.BUILDING_NOT_FOUND);
  });

  it("gracefully handles non-ApiError", () => {
    expect(mapBuildingActionError(new TypeError("Failed to fetch"))).toMatchObject({
      message: BUILDING_ACTION_ERROR_COPY.GENERIC,
      shouldRefresh: false,
    });
  });
});

describe("QA PR#4 supplement — formatQuantity extras", () => {
  it("formats large integers", () => {
    expect(formatQuantity(1_234_567)).toBe("1234567");
  });

  it("formats negative fractional values", () => {
    expect(formatQuantity(-0.5)).toBe("-0.5");
  });
});
