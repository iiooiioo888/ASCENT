import { describe, expect, it } from "vitest";
import { buildingDefs } from "./agriculture-catalog";

function systemCodeOf(buildingDefId: string): string {
  const def = buildingDefs.find((b) => b.id === buildingDefId);
  if (!def) throw new Error(`missing building def ${buildingDefId}`);
  return def.system_code;
}

describe("SPLIT-IND-MINING-BE：建築 system_code 產業分拆", () => {
  it("礦場／冶煉廠歸礦業；食品廠／紡織廠歸工業；牧場仍農業", () => {
    expect(systemCodeOf("bdef_mine")).toBe("mining");
    expect(systemCodeOf("bdef_smelter")).toBe("mining");
    expect(systemCodeOf("bdef_food_factory")).toBe("industry");
    expect(systemCodeOf("bdef_textile_mill")).toBe("industry");
    expect(systemCodeOf("bdef_ranch")).toBe("agriculture");
  });
});
