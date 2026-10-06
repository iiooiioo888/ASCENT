import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { BUILDING_STATE_CHANGED_COPY, formatActionError } from "./format";
import {
  isStaleBuildingActionError,
  resolveStaleBuildingActionCode,
  STALE_BUILDING_ACTION_CODES,
  STALE_BUILDING_ACTION_MESSAGE_ALIASES,
} from "./stale-building-action";

describe("resolveStaleBuildingActionCode", () => {
  it("maps HTTP 409 to building_state_conflict", () => {
    expect(
      resolveStaleBuildingActionCode(new ApiError("建築狀態已變更，請重新整理", 409)),
    ).toBe(STALE_BUILDING_ACTION_CODES.STATE_CONFLICT);
  });

  it("prefers API code over status and message", () => {
    expect(
      resolveStaleBuildingActionCode(
        new ApiError("任意文案", 400, STALE_BUILDING_ACTION_CODES.NOT_READY_TO_COLLECT),
      ),
    ).toBe(STALE_BUILDING_ACTION_CODES.NOT_READY_TO_COLLECT);
    expect(
      resolveStaleBuildingActionCode(
        new ApiError("任意文案", 500, STALE_BUILDING_ACTION_CODES.BUSY_OR_READY),
      ),
    ).toBe(STALE_BUILDING_ACTION_CODES.BUSY_OR_READY);
  });

  it("falls back to message aliases on HTTP 400 when code is absent", () => {
    for (const [message, code] of Object.entries(STALE_BUILDING_ACTION_MESSAGE_ALIASES)) {
      expect(resolveStaleBuildingActionCode(new ApiError(message, 400))).toBe(code);
    }
  });

  it("returns null for non-stale errors", () => {
    expect(resolveStaleBuildingActionCode(new ApiError("此建築不能使用該方式", 400))).toBeNull();
    expect(resolveStaleBuildingActionCode(new ApiError("資源不足：item_water", 400))).toBeNull();
  });
});

describe("isStaleBuildingActionError", () => {
  it("is true for any resolved stale code", () => {
    expect(
      isStaleBuildingActionError(
        new ApiError("x", 400, STALE_BUILDING_ACTION_CODES.BUSY_OR_READY),
      ),
    ).toBe(true);
    expect(isStaleBuildingActionError(new ApiError("建築狀態已變更，請重新整理", 409))).toBe(true);
  });

  it("is false for other ApiError", () => {
    expect(isStaleBuildingActionError(new ApiError("此建築不能使用該方式", 400))).toBe(false);
  });
});

describe("formatActionError", () => {
  it("uses BUILDING_STATE_CHANGED_COPY for stale codes and 409", () => {
    expect(
      formatActionError(
        new ApiError("後端可改文案", 400, STALE_BUILDING_ACTION_CODES.NOT_READY_TO_COLLECT),
      ),
    ).toBe(BUILDING_STATE_CHANGED_COPY);
    expect(formatActionError(new ApiError("尚無可收取產出", 400))).toBe(BUILDING_STATE_CHANGED_COPY);
    expect(formatActionError(new ApiError("建築狀態已變更，請重新整理", 409))).toBe(
      BUILDING_STATE_CHANGED_COPY,
    );
  });
});
