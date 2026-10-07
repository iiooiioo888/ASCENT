import { describe, expect, it } from "vitest";
import { sortBuildings } from "./buildingSort";
import type { Building } from "./types";

function building(overrides: Partial<Building> & Pick<Building, "id" | "buildingDefId">): Building {
  return {
    status: "idle",
    buildingDef: { name: "x", allowedRuleIds: [] },
    methodId: null,
    queue: [],
    bufferedOutputs: {},
    ...overrides,
  };
}

describe("sortBuildings (J-UX-1b)", () => {
  it("orders by catalog def id then stable building id", () => {
    const shuffled = [
      building({ id: "pb_shop", buildingDefId: "bdef_trading_post" }),
      building({ id: "pb_field", buildingDefId: "bdef_field" }),
      building({ id: "pb_mill", buildingDefId: "bdef_mill" }),
      building({ id: "pb_oven", buildingDefId: "bdef_oven" }),
    ];
    const ids = sortBuildings(shuffled).map((b) => b.id);
    expect(ids).toEqual(["pb_field", "pb_mill", "pb_oven", "pb_shop"]);
  });

  it("is stable when API row order flips between polls", () => {
    const a = [
      building({ id: "pb_well", buildingDefId: "bdef_well" }),
      building({ id: "pb_field", buildingDefId: "bdef_field" }),
    ];
    const b = [
      building({ id: "pb_field", buildingDefId: "bdef_field" }),
      building({ id: "pb_well", buildingDefId: "bdef_well" }),
    ];
    expect(sortBuildings(a).map((x) => x.id)).toEqual(sortBuildings(b).map((x) => x.id));
  });
});
