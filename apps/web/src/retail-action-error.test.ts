import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { mapRetailActionError } from "./retail-action-error";
import { RETAIL_COPY } from "./retailCopy";

describe("mapRetailActionError", () => {
  it("maps bread shortage to need stock", () => {
    expect(mapRetailActionError(new ApiError("資源不足：item_bread", 400)).message).toBe(
      RETAIL_COPY.needStock,
    );
  });

  it("maps expired offer with refresh", () => {
    const mapped = mapRetailActionError(new ApiError("客單已失效", 400));
    expect(mapped.message).toBe(RETAIL_COPY.expired);
    expect(mapped.shouldRefresh).toBe(true);
  });
});
