import { describe, expect, it } from "vitest";
import {
  DRAW_WATER_DURATION_GAME_SEC,
  DRAW_WATER_OUTPUT_QTY,
  SAVE_SEED_DURATION_GAME_SEC,
  SAVE_SEED_OUTPUT_QTY,
  SAVE_SEED_WHEAT_INPUT_QTY,
  buildingDefs,
  generateMethods,
  iosToRecord,
  items,
  rules,
  settleProduction,
  validateCatalog,
} from "./index";

function methodById(id: string) {
  const m = generateMethods(rules).find((x) => x.id === id);
  if (!m) throw new Error(`missing method ${id}`);
  return m;
}

describe("資源循環 RL-BE-1（catalog）", () => {
  it("G7：validateCatalog 對完整農業目錄為綠", () => {
    const methods = generateMethods(rules);
    const errors = validateCatalog({ items, rules, methods });
    expect(errors).toEqual([]);
    expect(methods.some((m) => m.id === "method_draw_water_default")).toBe(true);
    expect(methods.some((m) => m.id === "method_save_seed_default")).toBe(true);
    expect(methods.every((m) => m.rule_id)).toBe(true);
  });

  it("G1：汲水方式無輸入、產出水（簽核數值）", () => {
    const draw = methodById("method_draw_water_default");
    expect(draw.rule_id).toBe("rule_draw_water");
    expect(draw.inputs).toEqual([]);
    expect(iosToRecord(draw.outputs)).toEqual({ item_water: DRAW_WATER_OUTPUT_QTY });
    expect(draw.duration_game_sec).toBe(DRAW_WATER_DURATION_GAME_SEC);
    const well = buildingDefs.find((b) => b.id === "bdef_well");
    expect(well?.allowed_rule_ids).toContain("rule_draw_water");
  });

  it("G2：留種方式小麥→種子、掛田", () => {
    const save = methodById("method_save_seed_default");
    expect(save.rule_id).toBe("rule_save_seed");
    expect(iosToRecord(save.inputs)).toEqual({ item_wheat: SAVE_SEED_WHEAT_INPUT_QTY });
    expect(iosToRecord(save.outputs)).toEqual({ item_seed_wheat: SAVE_SEED_OUTPUT_QTY });
    expect(save.duration_game_sec).toBe(SAVE_SEED_DURATION_GAME_SEC);
    const field = buildingDefs.find((b) => b.id === "bdef_field");
    expect(field?.allowed_rule_ids).toContain("rule_save_seed");
  });
});

describe("資源循環 RL-BE-1（結算模擬）", () => {
  it("G1：汲水工時到可收取水", () => {
    const draw = methodById("method_draw_water_default");
    const job = {
      methodId: draw.id,
      durationGameSec: draw.duration_game_sec,
      elapsedGameSec: 0,
      inputs: {},
      outputs: iosToRecord(draw.outputs),
    };
    const running = settleProduction({
      status: "running",
      gameDeltaSec: draw.duration_game_sec - 1,
      queue: [job],
    });
    expect(running.status).toBe("running");
    const ready = settleProduction({
      status: "running",
      gameDeltaSec: 1,
      queue: running.queue,
    });
    expect(ready.status).toBe("ready");
    expect(ready.completedOutputs.item_water).toBe(DRAW_WATER_OUTPUT_QTY);
  });

  it("G6：種植→磨粉→和麵→烘烤方式鏈仍完整且可過驗證", () => {
    const chain = [
      "method_grow_wheat_default",
      "method_mill_flour_default",
      "method_make_dough_default",
      "method_bake_bread_default",
    ];
    const methods = generateMethods(rules);
    for (const id of chain) {
      expect(methods.some((m) => m.id === id)).toBe(true);
    }
    const grow = methodById("method_grow_wheat_default");
    const bake = methodById("method_bake_bread_default");
    expect(iosToRecord(grow.outputs).item_wheat).toBeGreaterThan(0);
    expect(iosToRecord(bake.outputs).item_bread).toBe(1);
    expect(validateCatalog({ items, rules, methods })).toEqual([]);
  });
});
