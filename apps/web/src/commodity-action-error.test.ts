import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { mapCommodityActionError } from "./commodity-action-error";
import { COMMODITY_COPY } from "./commodityCopy";

describe("mapCommodityActionError", () => {
  it("maps oil shortage to need stock", () => {
    expect(mapCommodityActionError(new ApiError("資源不足：item_oil", 400)).message).toBe(
      COMMODITY_COPY.needStock,
    );
  });

  it("maps fee too high", () => {
    expect(mapCommodityActionError(new ApiError("手續費過高", 400)).message).toBe(COMMODITY_COPY.feeHigh);
  });

  it("maps qty cap", () => {
    expect(mapCommodityActionError(new ApiError("超過單筆上限", 400)).message).toBe(COMMODITY_COPY.qtyCap);
  });

  it("does not surface transport errors as friendly transport copy", () => {
    expect(mapCommodityActionError(new ApiError("運費過高", 400)).message).toBe(COMMODITY_COPY.genericError);
  });
});
