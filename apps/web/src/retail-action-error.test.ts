import { describe, expect, it } from "vitest";
import { SETTLEMENT_INSUFFICIENT_MESSAGE } from "@ascent/shared";
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

  it("maps settlement insufficient to need gold copy", () => {
    expect(mapRetailActionError(new ApiError(SETTLEMENT_INSUFFICIENT_MESSAGE, 400)).message).toBe(
      RETAIL_COPY.needGold,
    );
    expect(mapRetailActionError(new ApiError("金幣不足", 400)).message).toBe(RETAIL_COPY.needGold);
  });
});
