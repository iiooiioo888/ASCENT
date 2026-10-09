import { describe, expect, it } from "vitest";
import {
  canHireWorkforce,
  effectiveWorkforceFree,
  hasWorkforceUi,
  showGoMarketForHire,
  showGoMarketForStart,
  startOpsPrecheck,
  sellTransportPreview,
  startGoldCost,
} from "./ops-depth";
import type { OpsCostsSnapshot, WorkforceSnapshot } from "./types";

const workforce: WorkforceSnapshot = { hired: 1, busy: 1, free: 0, maxHired: 4 };
const opsCosts: OpsCostsSnapshot = {
  hireCostGold: 80,
  laborCostPerStart: 1,
  wageByBuilding: { bdef_field: 10, bdef_mill: 20 },
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
    const ok = startOpsPrecheck("bdef_mill", 25, { ...workforce, free: 1, busy: 0 }, opsCosts);
    expect(ok.wage).toBe(20);
    expect(ok.haul).toBe(1);
    expect(ok.laborOk).toBe(true);
    expect(ok.goldOk).toBe(true);

    const poor = startOpsPrecheck("bdef_mill", 2, { ...workforce, free: 1, busy: 0 }, opsCosts);
    expect(poor.goldOk).toBe(false);

    const busy = startOpsPrecheck("bdef_field", 10, workforce, opsCosts);
    expect(busy.laborOk).toBe(false);
  });
});

describe("sellTransportPreview", () => {
  const withTransport: OpsCostsSnapshot = {
    ...opsCosts,
    sellTransport: { item_bread: 1 },
  };

  it("computes net gold for bread (T2)", () => {
    const preview = sellTransportPreview(8, 1, "item_bread", withTransport);
    expect(preview.grossGold).toBe(8);
    expect(preview.transportFee).toBe(1);
    expect(preview.netGold).toBe(7);
    expect(preview.transportTooHigh).toBe(false);
  });

  it("treats missing sellTransport as zero fee", () => {
    const preview = sellTransportPreview(8, 1, "item_bread", opsCosts);
    expect(preview.transportFee).toBe(0);
    expect(preview.netGold).toBe(8);
  });

  it("flags transportTooHigh when fee exceeds gross", () => {
    const preview = sellTransportPreview(0, 1, "item_bread", withTransport);
    expect(preview.transportTooHigh).toBe(true);
  });
});

describe("canHireWorkforce", () => {
  it("requires gold and headroom", () => {
    expect(canHireWorkforce({ ...workforce, hired: 1 }, 80, 80)).toBe(true);
    expect(canHireWorkforce({ ...workforce, hired: 1 }, 79, 80)).toBe(false);
    expect(canHireWorkforce({ ...workforce, hired: 4, free: 0 }, 100, 8)).toBe(false);
  });
});

describe("P-OD-4 go-market CTA gates", () => {
  it("showGoMarketForHire only when gold blocks hire", () => {
    const wf = { ...workforce, hired: 1, busy: 0, free: 1 };
    expect(showGoMarketForHire(wf, 79, 80)).toBe(true);
    expect(showGoMarketForHire(wf, 80, 80)).toBe(false);
    expect(showGoMarketForHire({ ...wf, hired: 4, maxHired: 4 }, 0, 80)).toBe(false);
  });

  it("showGoMarketForStart when gold blocks but not for labor-only or inputs", () => {
    const idleOk = { affordInputs: true, statusIdle: true, hasSelected: true };
    const poor = startOpsPrecheck("bdef_mill", 2, { ...workforce, free: 1, busy: 0 }, opsCosts);
    expect(showGoMarketForStart(poor, idleOk.affordInputs, idleOk.statusIdle, idleOk.hasSelected)).toBe(
      true,
    );

    const busy = startOpsPrecheck("bdef_field", 10, workforce, opsCosts);
    expect(showGoMarketForStart(busy, idleOk.affordInputs, idleOk.statusIdle, idleOk.hasSelected)).toBe(
      false,
    );

    expect(showGoMarketForStart(poor, false, true, true)).toBe(false);
  });
});
