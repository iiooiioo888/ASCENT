import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { mapMarketActionError } from "./market-action-error";
import { MARKET_COPY } from "./marketCopy";

describe("mapMarketActionError", () => {
  it("maps insufficient stock with item label", () => {
    expect(mapMarketActionError(new ApiError("資源不足：item_bread", 400)).message).toBe("資源不足：麵包");
  });

  it("maps insufficient gold", () => {
    expect(mapMarketActionError(new ApiError("金幣不足", 400)).message).toBe(MARKET_COPY.needGold);
    expect(mapMarketActionError(new ApiError("資源不足：item_gold", 400)).message).toBe(MARKET_COPY.needGold);
  });

  it("maps invalid quantity", () => {
    expect(mapMarketActionError(new ApiError("數量無效", 400)).message).toBe(MARKET_COPY.invalidQuantity);
  });

  it("maps not tradable items", () => {
    expect(mapMarketActionError(new ApiError("不可交易：item_gold", 400)).message).toContain("金幣");
  });

  it("falls back to generic copy", () => {
    expect(mapMarketActionError(new ApiError("完全未知", 418)).message).toBe(MARKET_COPY.genericError);
  });
});
