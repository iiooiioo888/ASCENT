import { describe, expect, it } from "vitest";
import { fieldPlotTitle, sortedFieldBuildingIds } from "./field-plot";
import type { Building } from "./types";

const field = (id: string): Building => ({
  id,
  buildingDefId: "bdef_field",
  status: "idle",
  methodId: null,
  queue: [],
  bufferedOutputs: {},
  buildingDef: { name: "田", allowedRuleIds: [] },
});

describe("field-plot", () => {
  it("sorts field ids lexicographically", () => {
    expect(sortedFieldBuildingIds([field("pb_field_b"), field("pb_field_a")])).toEqual([
      "pb_field_a",
      "pb_field_b",
    ]);
  });

  it("labels multiple fields 田 1 / 田 2", () => {
    const buildings = [field("pb_field_b"), field("pb_field_a")];
    expect(fieldPlotTitle(buildings, "pb_field_a")).toBe("田 1");
    expect(fieldPlotTitle(buildings, "pb_field_b")).toBe("田 2");
    expect(fieldPlotTitle([field("solo")], "solo")).toBeUndefined();
  });
});
