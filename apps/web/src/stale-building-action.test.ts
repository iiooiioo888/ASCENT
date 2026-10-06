import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { BUILDING_STATE_CHANGED_COPY, formatActionError } from "./format";
import { isStaleBuildingActionError, STALE_BUILDING_ACTION_MESSAGES } from "./stale-building-action";

describe("STALE_BUILDING_ACTION_MESSAGES", () => {
  it("matches main backend BadRequestException strings", () => {
    expect(STALE_BUILDING_ACTION_MESSAGES).toEqual(["尚無可收取產出", "建築忙碌或待收取"]);
  });
});

describe("isStaleBuildingActionError", () => {
  it("treats HTTP 409 as stale", () => {
    expect(isStaleBuildingActionError(new ApiError("建築狀態已變更，請重新整理", 409))).toBe(true);
  });

  it.each(STALE_BUILDING_ACTION_MESSAGES)("treats pre-PR#8 HTTP 400 %s as stale", (message) => {
    expect(isStaleBuildingActionError(new ApiError(message, 400))).toBe(true);
  });

  it("does not treat other HTTP 400 as stale", () => {
    expect(isStaleBuildingActionError(new ApiError("此建築不能使用該方式", 400))).toBe(false);
    expect(isStaleBuildingActionError(new ApiError("資源不足：item_water", 400))).toBe(false);
  });
});

describe("formatActionError with stale pre-PR#8 400", () => {
  it("uses the same card copy as 409", () => {
    expect(formatActionError(new ApiError("尚無可收取產出", 400))).toBe(BUILDING_STATE_CHANGED_COPY);
    expect(formatActionError(new ApiError("建築忙碌或待收取", 400))).toBe(BUILDING_STATE_CHANGED_COPY);
  });
});
