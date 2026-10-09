import { describe, expect, it } from "vitest";
import {
  FIELD_CAP,
  FIELD_BUILDING_DEF_ID,
  PLAYER_BUILDING_SLOT_CAP,
  SILO_BUILDING_DEF_ID,
  allowsAnotherInstanceOfDef,
  buildingCountsTowardSlotCap,
  canPurchaseField,
  isPlacementBlockedBySlotCap,
  countBuildingsOccupyingSlots,
  countPlayerFields,
  fieldPurchasePriceGold,
} from "./land-config";

describe("land-config", () => {
  it("加購田價：第二塊 10、第三塊 18", () => {
    expect(fieldPurchasePriceGold(1)).toBe(10);
    expect(fieldPurchasePriceGold(2)).toBe(18);
    expect(fieldPurchasePriceGold(3)).toBeNull();
  });

  it("countPlayerFields", () => {
    const buildings = [
      { buildingDefId: FIELD_BUILDING_DEF_ID },
      { buildingDefId: "bdef_mill" },
      { buildingDefId: FIELD_BUILDING_DEF_ID },
    ];
    expect(countPlayerFields(buildings)).toBe(2);
  });

  it("產業擴充不佔農業槽，槽滿後仍可放置", () => {
    expect(buildingCountsTowardSlotCap("bdef_mine")).toBe(false);
    expect(buildingCountsTowardSlotCap("bdef_machine_shop")).toBe(false);
    const buildings = [
      { buildingDefId: FIELD_BUILDING_DEF_ID },
      { buildingDefId: "bdef_mill" },
      { buildingDefId: "bdef_mine" },
      { buildingDefId: "bdef_smelter" },
    ];
    expect(countBuildingsOccupyingSlots(buildings)).toBe(2);
    const atCap = Array.from({ length: PLAYER_BUILDING_SLOT_CAP }, () => ({
      buildingDefId: "bdef_mill",
    }));
    expect(isPlacementBlockedBySlotCap("bdef_mill", atCap)).toBe(true);
    expect(isPlacementBlockedBySlotCap("bdef_kiln", atCap)).toBe(false);
  });

  it("倉不佔槽", () => {
    expect(buildingCountsTowardSlotCap(SILO_BUILDING_DEF_ID)).toBe(false);
    const buildings = [
      { buildingDefId: FIELD_BUILDING_DEF_ID },
      { buildingDefId: SILO_BUILDING_DEF_ID },
      { buildingDefId: "bdef_mill" },
    ];
    expect(countBuildingsOccupyingSlots(buildings)).toBe(2);
  });

  it("canPurchaseField 於開局狀態可買", () => {
    const r = canPurchaseField({ fieldCount: 1, slottedBuildingCount: 5 });
    expect(r).toEqual({ ok: true, priceGold: 10 });
  });

  it("有倉仍可按佔槽數擴田", () => {
    const r = canPurchaseField({ fieldCount: 1, slottedBuildingCount: 5 });
    expect(r.ok).toBe(true);
  });

  it("田達上限拒買", () => {
    expect(canPurchaseField({ fieldCount: FIELD_CAP, slottedBuildingCount: 5 }).ok).toBe(false);
  });

  it("建築槽滿拒買", () => {
    const r = canPurchaseField({ fieldCount: 1, slottedBuildingCount: PLAYER_BUILDING_SLOT_CAP });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("BUILDING_SLOTS_FULL");
  });

  it("allowsAnotherInstanceOfDef", () => {
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 0)).toBe(true);
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 1)).toBe(true);
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 2)).toBe(true);
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 3)).toBe(false);
    expect(allowsAnotherInstanceOfDef("bdef_mill", 0)).toBe(true);
    expect(allowsAnotherInstanceOfDef("bdef_mill", 1)).toBe(false);
  });
});
