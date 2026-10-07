import { describe, expect, it } from "vitest";
import {
  buildingScrollAnchorId,
  pickSaveSeedMethodId,
  isWellPlacementUiHidden,
  resolveWellScrollAnchorId,
  unplacedPlotAnchorId,
} from "./depletion-scroll";
import { FIELD_BUILDING_DEF_ID, METHOD_SAVE_SEED_ID, WELL_BUILDING_DEF_ID } from "./resource-loop-copy";
import type { Building, Method } from "./types";

const building = (partial: Partial<Building> & Pick<Building, "id" | "buildingDefId">): Building => ({
  status: "idle",
  buildingDef: { name: "x", allowedRuleIds: partial.buildingDef?.allowedRuleIds ?? [] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
  ...partial,
});

describe("depletion scroll anchors", () => {
  it("builds stable anchor ids for placed and unplaced plots", () => {
    expect(buildingScrollAnchorId("b_well_1")).toBe("building-b_well_1");
    expect(unplacedPlotAnchorId(WELL_BUILDING_DEF_ID)).toBe("plot-unplaced-bdef_well");
  });

  it("resolves well scroll to placed building when well exists", () => {
    const buildings = [
      building({ id: "b_field", buildingDefId: FIELD_BUILDING_DEF_ID }),
      building({ id: "b_well", buildingDefId: WELL_BUILDING_DEF_ID }),
    ];
    expect(resolveWellScrollAnchorId(buildings)).toBe("building-b_well");
  });

  it("returns null when well not placed (v1.1: no unplaced well plot in UI)", () => {
    const buildings = [building({ id: "b_field", buildingDefId: FIELD_BUILDING_DEF_ID })];
    expect(resolveWellScrollAnchorId(buildings)).toBeNull();
  });

  it("hides unplaced well placement card in App filter", () => {
    expect(isWellPlacementUiHidden(WELL_BUILDING_DEF_ID)).toBe(true);
    expect(isWellPlacementUiHidden(FIELD_BUILDING_DEF_ID)).toBe(false);
  });

  it("picks save-seed method only when listed on field options", () => {
    const field = building({
      id: "b_field",
      buildingDefId: FIELD_BUILDING_DEF_ID,
      buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat", "rule_save_seed"] },
    });
    const grow: Method = {
      id: "method_grow_wheat_default",
      code: "grow",
      ruleId: "rule_grow_wheat",
      durationGameSec: 1,
      inputs: [],
      outputs: [],
    };
    const save: Method = {
      id: METHOD_SAVE_SEED_ID,
      code: "save",
      ruleId: "rule_save_seed",
      durationGameSec: 1,
      inputs: [],
      outputs: [],
    };
    const methodsByRule = new Map<string, Method[]>([
      ["rule_grow_wheat", [grow]],
      ["rule_save_seed", [save]],
    ]);
    expect(pickSaveSeedMethodId(field, methodsByRule)).toBe(METHOD_SAVE_SEED_ID);

    const methodsWithoutSave = new Map<string, Method[]>([["rule_grow_wheat", [grow]]]);
    expect(pickSaveSeedMethodId(field, methodsWithoutSave)).toBeUndefined();
  });
});
