import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { mapRetailShelfActionError } from "./retail-shelf-action-error";
import { RETAIL_SHELF_COPY } from "./retailShelfCopy";

describe("mapRetailShelfActionError", () => {
  it("maps ask validation message", () => {
    const mapped = mapRetailShelfActionError(new ApiError("ask 須為 ≥1 的整數", 400));
    expect(mapped.message).toBe(RETAIL_SHELF_COPY.askInvalid);
    expect(mapped.shouldRefresh).toBe(false);
  });

  it("falls back to generic error", () => {
    const mapped = mapRetailShelfActionError(new ApiError("未知", 500));
    expect(mapped.message).toBe(RETAIL_SHELF_COPY.genericError);
  });
});
