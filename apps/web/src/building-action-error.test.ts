import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import {
  BUILDING_ACTION_ERROR_CODES,
  BUILDING_ACTION_ERROR_COPY,
  formatActionError,
  isStaleBuildingActionError,
  mapBuildingActionError,
} from "./building-action-error";
import { OPS_DEPTH_COPY } from "./ops-depth-copy";

describe("mapBuildingActionError — known mappings", () => {
  it("maps BUILDING_STATE_CONFLICT by code", () => {
    const mapped = mapBuildingActionError(
      new ApiError("任意", 409, BUILDING_ACTION_ERROR_CODES.BUILDING_STATE_CONFLICT),
    );
    expect(mapped.message).toBe(BUILDING_ACTION_ERROR_COPY.STATE_CHANGED);
    expect(mapped.shouldRefresh).toBe(true);
  });

  it("maps state-changed message on 409 when code is absent", () => {
    expect(mapBuildingActionError(new ApiError(BUILDING_ACTION_ERROR_COPY.STATE_CHANGED, 409))).toMatchObject({
      message: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
      shouldRefresh: true,
    });
    expect(mapBuildingActionError(new ApiError("其他 409 文案", 409))).toMatchObject({
      message: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
      shouldRefresh: true,
    });
  });

  it("maps settlement conflict by code and message", () => {
    expect(
      mapBuildingActionError(
        new ApiError("x", 409, BUILDING_ACTION_ERROR_CODES.BUILDING_SETTLEMENT_CONFLICT),
      ).message,
    ).toBe(BUILDING_ACTION_ERROR_COPY.SETTLEMENT_CONFLICT);
    expect(mapBuildingActionError(new ApiError(BUILDING_ACTION_ERROR_COPY.SETTLEMENT_CONFLICT, 409)).message).toBe(
      BUILDING_ACTION_ERROR_COPY.SETTLEMENT_CONFLICT,
    );
    expect(mapBuildingActionError(new ApiError(BUILDING_ACTION_ERROR_COPY.SETTLEMENT_CONFLICT, 409)).shouldRefresh).toBe(
      false,
    );
  });

  it("maps collect/start race aliases to state-changed + refresh", () => {
    expect(mapBuildingActionError(new ApiError("尚無可收取產出", 400)).shouldRefresh).toBe(true);
    expect(mapBuildingActionError(new ApiError("建築忙碌或待收取", 400)).message).toBe(
      BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
    );
    expect(
      mapBuildingActionError(
        new ApiError("m", 400, BUILDING_ACTION_ERROR_CODES.BUILDING_NOT_READY_TO_COLLECT),
      ).shouldRefresh,
    ).toBe(true);
  });

  it("maps fallow field start rejection", () => {
    expect(mapBuildingActionError(new ApiError("土地休耕中", 400)).message).toBe("土地休耕中");
    expect(mapBuildingActionError(new ApiError("土地休耕中", 400)).shouldRefresh).toBe(false);
  });

  it("maps ops-depth workforce and gold errors", () => {
    expect(mapBuildingActionError(new ApiError("人手不足", 400)).message).toBe(OPS_DEPTH_COPY.needHands);
    expect(mapBuildingActionError(new ApiError("金幣不足", 400)).message).toBe(OPS_DEPTH_COPY.needGold);
    expect(mapBuildingActionError(new ApiError("已達僱工上限", 400)).message).toBe(OPS_DEPTH_COPY.workforceCap);
    expect(mapBuildingActionError(new ApiError("資源不足：item_gold", 400)).message).toBe(OPS_DEPTH_COPY.needGold);
  });

  it("maps insufficient materials with item display names", () => {
    expect(mapBuildingActionError(new ApiError("資源不足：item_egg", 400)).message).toBe("資源不足：雞蛋");
    expect(mapBuildingActionError(new ApiError("資源不足：雞蛋", 400)).message).toBe("資源不足：雞蛋");
    expect(mapBuildingActionError(new ApiError("資源不足：item_water", 400)).message).toBe("資源不足：水");
    expect(
      mapBuildingActionError(
        new ApiError("資源不足：item_water", 400, BUILDING_ACTION_ERROR_CODES.INSUFFICIENT_MATERIALS),
      ).message,
    ).toBe("資源不足：水");
  });

  it("maps method not allowed and building not found", () => {
    expect(formatActionError(new ApiError("此建築不能使用該方式", 400))).toBe(
      BUILDING_ACTION_ERROR_COPY.METHOD_NOT_ALLOWED,
    );
    expect(formatActionError(new ApiError("建築不存在", 404))).toBe(BUILDING_ACTION_ERROR_COPY.BUILDING_NOT_FOUND);
  });
});

describe("mapBuildingActionError — code preferred over message", () => {
  it("uses code registry when message differs", () => {
    const mapped = mapBuildingActionError(
      new ApiError("錯誤的中文", 400, BUILDING_ACTION_ERROR_CODES.BUILDING_SETTLEMENT_CONFLICT),
    );
    expect(mapped.message).toBe(BUILDING_ACTION_ERROR_COPY.SETTLEMENT_CONFLICT);
    expect(mapped.shouldRefresh).toBe(false);
  });
});

describe("mapBuildingActionError — unknown fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns generic copy for unmapped ApiError", () => {
    expect(mapBuildingActionError(new ApiError("完全未知", 418)).message).toBe(
      BUILDING_ACTION_ERROR_COPY.GENERIC,
    );
    expect(isStaleBuildingActionError(new ApiError("完全未知", 418))).toBe(false);
  });

  it("attaches debug hint only in DEV", () => {
    vi.stubEnv("DEV", true);
    expect(mapBuildingActionError(new ApiError("完全未知", 418)).hint).toContain("完全未知");
    vi.stubEnv("DEV", false);
    expect(mapBuildingActionError(new ApiError("完全未知", 418)).hint).toBeUndefined();
  });
});
