import { describe, expect, it } from "vitest";
import {
  AFK_AUTO_PAUSE_REASON,
  defaultAutoMethodIdForBuilding,
  mapStartFailureToAutoPauseReason,
} from "./afk-config";

describe("afk-config", () => {
  it("預設主配方對齊 AFK-D3", () => {
    expect(defaultAutoMethodIdForBuilding("bdef_field")).toBe("method_grow_wheat_default");
    expect(defaultAutoMethodIdForBuilding("bdef_mill")).toBe("method_mill_flour_default");
    expect(defaultAutoMethodIdForBuilding("bdef_oven")).toBe("method_bake_bread_default");
    expect(defaultAutoMethodIdForBuilding("bdef_well")).toBe("method_draw_water_default");
    expect(defaultAutoMethodIdForBuilding("bdef_trading_post")).toBeNull();
  });

  it("start 失敗訊息對齊暫停文案", () => {
    expect(mapStartFailureToAutoPauseReason("人手不足")).toBe(AFK_AUTO_PAUSE_REASON.WORKFORCE);
    expect(mapStartFailureToAutoPauseReason("金幣不足")).toBe(AFK_AUTO_PAUSE_REASON.GOLD);
    expect(mapStartFailureToAutoPauseReason("資源不足：item_water")).toBe(AFK_AUTO_PAUSE_REASON.MATERIALS);
    expect(mapStartFailureToAutoPauseReason("建築忙碌或待收取")).toBeNull();
  });
});
