import { describe, expect, it } from "vitest";
import {
  AFK_AUTO_PAUSE_REASON,
  compareBuildingsForAfkAutoStart,
  defaultAutoMethodIdForBuilding,
  mapStartFailureToAutoPauseReason,
  sortBuildingsForAfkAutoStart,
} from "./afk-config";

describe("afk-config", () => {
  it("預設主配方對齊 AFK-D3", () => {
    expect(defaultAutoMethodIdForBuilding("bdef_field")).toBe("method_grow_wheat_default");
    expect(defaultAutoMethodIdForBuilding("bdef_mill")).toBe("method_mill_flour_default");
    expect(defaultAutoMethodIdForBuilding("bdef_oven")).toBe("method_bake_bread_default");
    expect(defaultAutoMethodIdForBuilding("bdef_well")).toBe("method_draw_water_default");
    expect(defaultAutoMethodIdForBuilding("bdef_trading_post")).toBeNull();
  });

  it("麵包鏈自動開工排序：爐 → 食品廠 → 牧場 → 磨 → 田", () => {
    const ids = sortBuildingsForAfkAutoStart([
      { id: "pb_player_local_bdef_field", buildingDefId: "bdef_field" },
      { id: "pb_player_local_bdef_oven", buildingDefId: "bdef_oven" },
      { id: "pb_player_local_bdef_mill", buildingDefId: "bdef_mill" },
      { id: "pb_player_local_bdef_ranch", buildingDefId: "bdef_ranch" },
      { id: "pb_player_local_bdef_food_factory", buildingDefId: "bdef_food_factory" },
      { id: "pb_player_local_bdef_well", buildingDefId: "bdef_well" },
    ]).map((b) => b.buildingDefId);
    expect(ids).toEqual([
      "bdef_oven",
      "bdef_food_factory",
      "bdef_ranch",
      "bdef_mill",
      "bdef_field",
      "bdef_well",
    ]);
    expect(
      compareBuildingsForAfkAutoStart(
        { buildingDefId: "bdef_mill" },
        { buildingDefId: "bdef_field" },
      ),
    ).toBeLessThan(0);
    expect(
      compareBuildingsForAfkAutoStart(
        { buildingDefId: "bdef_ranch" },
        { buildingDefId: "bdef_mill" },
      ),
    ).toBeLessThan(0);
  });

  it("牧場預設自動配方", () => {
    expect(defaultAutoMethodIdForBuilding("bdef_ranch")).toBe("method_raise_livestock_default");
  });

  it("食品廠預設自動配方", () => {
    expect(defaultAutoMethodIdForBuilding("bdef_food_factory")).toBe("method_bake_cake_default");
  });

  it("紡織廠預設自動配方", () => {
    expect(defaultAutoMethodIdForBuilding("bdef_textile_mill")).toBe("method_weave_cloth_default");
  });

  it("start 失敗訊息對齊暫停文案", () => {
    expect(mapStartFailureToAutoPauseReason("人手不足")).toBe(AFK_AUTO_PAUSE_REASON.WORKFORCE);
    expect(mapStartFailureToAutoPauseReason("銅錠不足")).toBe(AFK_AUTO_PAUSE_REASON.GOLD);
    expect(mapStartFailureToAutoPauseReason("金幣不足")).toBe(AFK_AUTO_PAUSE_REASON.GOLD);
    expect(mapStartFailureToAutoPauseReason("資源不足：item_water")).toBe(AFK_AUTO_PAUSE_REASON.MATERIALS);
    expect(mapStartFailureToAutoPauseReason("建築忙碌或待收取")).toBeNull();
  });
});
