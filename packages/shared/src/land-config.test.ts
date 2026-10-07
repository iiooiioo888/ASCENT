import { describe, expect, it } from "vitest";
import {
  FIELD_CAP,
  FIELD_BUILDING_DEF_ID,
  PLAYER_BUILDING_SLOT_CAP,
  allowsAnotherInstanceOfDef,
  canPurchaseField,
  countPlayerFields,
  fieldPurchasePriceGold,
} from "./land-config";

describe("land-config", () => {
  it("開局 1 田時加購價為 10", () => {
    expect(fieldPurchasePriceGold(1)).toBe(10);
    expect(fieldPurchasePriceGold(2)).toBeNull();
  });

  it("countPlayerFields", () => {
    const buildings = [
      { buildingDefId: FIELD_BUILDING_DEF_ID },
      { buildingDefId: "bdef_mill" },
      { buildingDefId: FIELD_BUILDING_DEF_ID },
    ];
    expect(countPlayerFields(buildings)).toBe(2);
  });

  it("canPurchaseField 於開局狀態可買", () => {
    const r = canPurchaseField({ fieldCount: 1, buildingCount: 5 });
    expect(r).toEqual({ ok: true, priceGold: 10 });
  });

  it("田達上限拒買", () => {
    expect(canPurchaseField({ fieldCount: FIELD_CAP, buildingCount: 5 }).ok).toBe(false);
  });

  it("建築槽滿拒買", () => {
    const r = canPurchaseField({ fieldCount: 1, buildingCount: PLAYER_BUILDING_SLOT_CAP });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("BUILDING_SLOTS_FULL");
  });

  it("allowsAnotherInstanceOfDef", () => {
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 0)).toBe(true);
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 1)).toBe(true);
    expect(allowsAnotherInstanceOfDef(FIELD_BUILDING_DEF_ID, 2)).toBe(false);
    expect(allowsAnotherInstanceOfDef("bdef_mill", 0)).toBe(true);
    expect(allowsAnotherInstanceOfDef("bdef_mill", 1)).toBe(false);
  });
});
