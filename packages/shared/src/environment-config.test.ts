import { describe, expect, it } from "vitest";
import {
  advanceWeatherState,
  DEFAULT_ENVIRONMENT_CONFIG,
  environmentConfigFromDb,
  environmentSnapshot,
  isFieldGrowRuleId,
  isFallowActive,
  scaleOutputsByYield,
} from "./environment-config";

describe("environment-config", () => {
  it("isFieldGrowRuleId 只認 grow_*", () => {
    expect(isFieldGrowRuleId("rule_grow_wheat")).toBe(true);
    expect(isFieldGrowRuleId("rule_save_seed")).toBe(false);
    expect(isFieldGrowRuleId("rule_mill_flour")).toBe(false);
  });

  it("environmentConfigFromDb 非法欄位回退預設", () => {
    const cfg = environmentConfigFromDb({ fallowDurationGameSec: -1, yieldMult: { rain: 0 } });
    expect(cfg.fallowDurationGameSec).toBe(DEFAULT_ENVIRONMENT_CONFIG.fallowDurationGameSec);
    expect(cfg.yieldMult.rain).toBe(1.15);
  });

  it("scaleOutputsByYield 四捨五入", () => {
    expect(scaleOutputsByYield({ item_wheat: 2, item_straw: 1 }, 0.75)).toEqual({
      item_wheat: 2,
      item_straw: 1,
    });
    expect(scaleOutputsByYield({ item_wheat: 2 }, 1.15)).toEqual({ item_wheat: 2 });
  });

  it("advanceWeatherState 沿 rotation 推進", () => {
    const config = environmentConfigFromDb(null);
    const s0 = { weather: "fair" as const, nextChangeAtGame: 1000 };
    const s1 = advanceWeatherState(config, s0, 1000);
    expect(s1.weather).toBe("rain");
    expect(s1.nextChangeAtGame).toBe(1000 + config.weatherDurationGameSec);
  });

  it("isFallowActive 與 snapshot", () => {
    expect(isFallowActive(5000, 4000)).toBe(true);
    expect(isFallowActive(5000, 5000)).toBe(false);
    const snap = environmentSnapshot(DEFAULT_ENVIRONMENT_CONFIG, "drought", 9000, 1000);
    expect(snap).toMatchObject({ weather: "drought", yieldMult: 0.75, nextChangeAt: 9000 });
  });
});
