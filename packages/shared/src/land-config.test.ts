import { describe, expect, it } from "vitest";
import {
  FIELD_CAP,
  FIELD_EARLY_CAP,
  FIELD_BUILDING_DEF_ID,
  FIELD_CULTIVATION_INTENSIVE,
  PLAYER_BUILDING_SLOT_CAP,
  SILO_BUILDING_DEF_ID,
  allowsAnotherInstanceOfDef,
  buildingCountsTowardSlotCap,
  buildingSlotFootprint,
  canPurchaseField,
  canSwitchFieldToIntensive,
  isPlacementBlockedBySlotCap,
  countBuildingsOccupyingSlots,
  countPlayerFields,
  fieldCapForLifetime,
  fieldPurchasePriceGold,
} from "./land-config";

describe("land-config", () => {
  it("加購田價：第二塊 10、第三塊 18；終局 cap 12", () => {
    expect(fieldPurchasePriceGold(1)).toBe(10);
    expect(fieldPurchasePriceGold(2)).toBe(18);
    expect(fieldPurchasePriceGold(11)).toBe(180);
    expect(fieldPurchasePriceGold(12)).toBeNull();
    expect(FIELD_EARLY_CAP).toBe(2);
    expect(FIELD_CAP).toBe(PLAYER_BUILDING_SLOT_CAP);
  });

  it("未收 8 麵包前田上限 2", () => {
    expect(fieldCapForLifetime({})).toBe(2);
    expect(fieldCapForLifetime({ item_bread: 7 })).toBe(2);
    expect(fieldCapForLifetime({ item_bread: 8 })).toBe(12);
  });

  it("countPlayerFields", () => {
    const buildings = [
      { buildingDefId: FIELD_BUILDING_DEF_ID },
      { buildingDefId: "bdef_mill" },
      { buildingDefId: FIELD_BUILDING_DEF_ID },
    ];
    expect(countPlayerFields(buildings)).toBe(2);
  });

  it("P4 礦場／冶煉廠佔槽；產業擴充礦坑不佔槽", () => {
    expect(buildingCountsTowardSlotCap("bdef_mine")).toBe(true);
    expect(buildingCountsTowardSlotCap("bdef_smelter")).toBe(true);
    expect(buildingCountsTowardSlotCap("bdef_mining_pit")).toBe(false);
    expect(buildingCountsTowardSlotCap("bdef_machine_shop")).toBe(false);
    const buildings = [
      { buildingDefId: FIELD_BUILDING_DEF_ID },
      { buildingDefId: "bdef_mill" },
      { buildingDefId: "bdef_mining_pit" },
      { buildingDefId: "bdef_smelting_works" },
    ];
    expect(countBuildingsOccupyingSlots(buildings)).toBe(2);
    const atCap = Array.from({ length: PLAYER_BUILDING_SLOT_CAP }, () => ({
      buildingDefId: "bdef_mill",
    }));
    expect(isPlacementBlockedBySlotCap("bdef_mill", atCap)).toBe(true);
    expect(isPlacementBlockedBySlotCap("bdef_kiln", atCap)).toBe(false);
  });

  it("密集田佔 2 槽", () => {
    expect(
      buildingSlotFootprint({
        buildingDefId: FIELD_BUILDING_DEF_ID,
        specialization: FIELD_CULTIVATION_INTENSIVE,
      }),
    ).toBe(2);
    expect(
      countBuildingsOccupyingSlots([
        { buildingDefId: FIELD_BUILDING_DEF_ID, specialization: FIELD_CULTIVATION_INTENSIVE },
        { buildingDefId: "bdef_mill" },
      ]),
    ).toBe(3);
  });

  it("槽滿時不能改密集", () => {
    const blocked = canSwitchFieldToIntensive({
      status: "idle",
      currentMode: "rotation",
      slottedBuildingCount: PLAYER_BUILDING_SLOT_CAP,
    });
    expect(blocked.ok).toBe(false);
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

  it("早期田上限 2 拒買", () => {
    expect(canPurchaseField({ fieldCount: 2, slottedBuildingCount: 5 }).ok).toBe(false);
    expect(canPurchaseField({ fieldCount: 2, slottedBuildingCount: 5, fieldCap: 12 }).ok).toBe(true);
  });

  it("建築槽滿拒買", () => {
    const r = canPurchaseField({ fieldCount: 1, slottedBuildingCount: PLAYER_BUILDING_SLOT_CAP });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("BUILDING_SLOTS_FULL");
  });

  it("allowsAnotherInstanceOfDef", () => {
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 0)).toBe(true);
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 1)).toBe(true);
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 2)).toBe(false);
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 2, 12)).toBe(true);
    expect(allowsAnotherInstanceOfDef("bdef_mill", 0)).toBe(true);
    expect(allowsAnotherInstanceOfDef("bdef_mill", 1)).toBe(false);
  });
});
