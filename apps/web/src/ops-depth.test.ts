import { describe, expect, it } from "vitest";
import {
  canHireWorkforce,
  effectiveWorkforceFree,
  hasWorkforceUi,
  startOpsPrecheck,
  startGoldCost,
} from "./ops-depth";
import type { OpsCostsSnapshot, WorkforceSnapshot } from "./types";

const workforce: WorkforceSnapshot = { hired: 1, busy: 1, free: 0, maxHired: 4 };
const opsCosts: OpsCostsSnapshot = {
  hireCostGold: 8,
  laborCostPerStart: 1,
  wageByBuilding: { bdef_field: 1, bdef_mill: 2 },
  haulByBuilding: { bdef_field: 0, bdef_mill: 1 },
};

describe("ops-depth defensive defaults", () => {
  it("treats missing workforce as infinite free labor", () => {
    expect(effectiveWorkforceFree(undefined)).toBe(Number.POSITIVE_INFINITY);
    expect(startOpsPrecheck("bdef_field", 0, undefined, undefined).laborOk).toBe(true);
  });

  it("treats missing opsCosts as zero gold ops cost", () => {
    expect(startGoldCost(undefined, "bdef_mill")).toBe(0);
    expect(startOpsPrecheck("bdef_mill", 0, workforce, undefined).goldOk).toBe(true);
  });

  it("hides workforce UI without both snapshots", () => {
    expect(hasWorkforceUi(workforce, undefined)).toBe(false);
    expect(hasWorkforceUi(undefined, opsCosts)).toBe(false);
    expect(hasWorkforceUi(workforce, opsCosts)).toBe(true);
  });
});

describe("startOpsPrecheck", () => {
  it("flags labor and gold shortages for mill", () => {
    const ok = startOpsPrecheck("bdef_mill", 10, { ...workforce, free: 1, busy: 0 }, opsCosts);
    expect(ok.wage).toBe(2);
    expect(ok.haul).toBe(1);
    expect(ok.laborOk).toBe(true);
    expect(ok.goldOk).toBe(true);

    const poor = startOpsPrecheck("bdef_mill", 2, { ...workforce, free: 1, busy: 0 }, opsCosts);
    expect(poor.goldOk).toBe(false);

    const busy = startOpsPrecheck("bdef_field", 10, workforce, opsCosts);
    expect(busy.laborOk).toBe(false);
  });
});

describe("canHireWorkforce", () => {
  it("requires gold and headroom", () => {
    expect(canHireWorkforce({ ...workforce, hired: 1 }, 8, 8)).toBe(true);
    expect(canHireWorkforce({ ...workforce, hired: 1 }, 7, 8)).toBe(false);
    expect(canHireWorkforce({ ...workforce, hired: 4, free: 0 }, 100, 8)).toBe(false);
  });
});
