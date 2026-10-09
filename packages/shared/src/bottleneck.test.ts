import { describe, expect, it } from "vitest";
import { buildingBottleneck, millLagHint } from "./bottleneck";

const grow = {
  id: "method_grow_wheat_default",
  durationGameSec: 3600,
  inputs: [
    { item_id: "item_seed_wheat", qty: 1 },
    { item_id: "item_water", qty: 1 },
  ],
  outputs: [
    { item_id: "item_wheat", qty: 2 },
    { item_id: "item_straw", qty: 1 },
  ],
};
const mill = {
  id: "method_mill_flour_default",
  durationGameSec: 1800,
  inputs: [{ item_id: "item_wheat", qty: 2 }],
  outputs: [{ item_id: "item_flour", qty: 1 }],
};

describe("生產節拍 HUD", () => {
  it("閒置缺料標原料短缺", () => {
    const hint = buildingBottleneck(
      { id: "f", buildingDefId: "bdef_field", status: "idle", bufferedOutputs: {} },
      grow,
      { item_seed_wheat: 1, item_water: 0 },
      [],
      [grow, mill],
    );
    expect(hint?.kind).toBe("input_short");
  });

  it("ready 標輸出緩衝待收取", () => {
    const hint = buildingBottleneck(
      { id: "f", buildingDefId: "bdef_field", status: "ready", bufferedOutputs: { item_wheat: 2 } },
      grow,
      {},
      [],
      [grow, mill],
    );
    expect(hint?.kind).toBe("output_full");
  });

  it("磨坊工時拉長時標慢於田", () => {
    const slowMill = { ...mill, durationGameSec: 7200 };
    const hint = millLagHint(
      [
        { id: "f", buildingDefId: "bdef_field", status: "running", bufferedOutputs: {} },
        { id: "m", buildingDefId: "bdef_mill", status: "running", bufferedOutputs: {} },
      ],
      [grow, slowMill],
    );
    expect(hint?.label).toBe("磨坊慢於田");
  });
});
