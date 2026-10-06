import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { BUILDING_ACTION_ERROR_COPY } from "./building-action-error";
import { formatActionError, formatQuantity, formatUserError, fmtIo } from "./format";

describe("formatQuantity", () => {
  it("shows integers without decimals", () => {
    expect(formatQuantity(80)).toBe("80");
    expect(formatQuantity(0)).toBe("0");
  });

  it("shows fractional values with up to 2 decimals", () => {
    expect(formatQuantity(79.5)).toBe("79.5");
    expect(formatQuantity(0.5)).toBe("0.5");
    expect(formatQuantity(1.25)).toBe("1.25");
  });

  it("trims trailing zeros on fractional values", () => {
    expect(formatQuantity(1.1)).toBe("1.1");
    expect(formatQuantity(1.5)).toBe("1.5");
  });
});

describe("formatUserError", () => {
  it("removes Error prefix and maps item ids", () => {
    expect(formatUserError(new Error("資源不足：item_water"))).toBe("資源不足：水");
    expect(formatUserError("Error: 資源不足：item_water")).toBe("資源不足：水");
  });
});

describe("formatActionError", () => {
  it("delegates to building action mapper", () => {
    expect(formatActionError(new ApiError("建築狀態已變更，請重新整理", 409))).toBe(
      BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
    );
    expect(formatActionError(new ApiError("此建築不能使用該方式", 400))).toBe(
      BUILDING_ACTION_ERROR_COPY.METHOD_NOT_ALLOWED,
    );
  });
});

describe("fmtIo", () => {
  it("formats fractional input quantities", () => {
    expect(fmtIo([{ item_id: "item_water", qty: 0.5 }])).toContain("×0.5");
  });
});
