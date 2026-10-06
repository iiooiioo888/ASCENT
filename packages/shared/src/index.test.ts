import { describe, expect, it } from "vitest";
import {
  GAME_CONFIG,
  GAME_DAY_GAME_SEC,
  MAX_OFFLINE_GAME_SEC,
  MAX_OFFLINE_REAL_SEC,
  TIME_SCALE,
  displayGameTime,
  gameConfigFromDb,
  generateMethods,
  itemProperties,
  items,
  rules,
  settleProduction,
  settleWindow,
  validateCatalog,
} from "./index";

describe("遊戲設定", () => {
  it("DB 缺列時回退常數", () => {
    expect(gameConfigFromDb(null)).toEqual(GAME_CONFIG);
  });
});

describe("時間契約", () => {
  it("1 真實秒 = 60 遊戲秒", () => {
    const game = displayGameTime({ startRealTimeMs: 0, startGameTime: 0 }, 1000);
    expect(game).toBe(60);
    expect(TIME_SCALE).toBe(60);
  });

  it("離線 cap 為 8 現實小時", () => {
    const tenHoursMs = 10 * 3600 * 1000;
    const w = settleWindow({
      lastSettledAtMs: 0,
      nowRealMs: tenHoursMs,
      timeScale: TIME_SCALE,
      maxOfflineRealSec: MAX_OFFLINE_REAL_SEC,
    });
    expect(w.cappedRealDeltaSec).toBe(28800);
    expect(w.gameDeltaSec).toBe(1_728_000);
    expect(w.nextLastSettledAtMs).toBe(tenHoursMs);
    expect(MAX_OFFLINE_GAME_SEC).toBe(1_728_000);
  });

  it("86400 不是入帳 cap", () => {
    expect(MAX_OFFLINE_REAL_SEC).not.toBe(GAME_DAY_GAME_SEC);
    expect(MAX_OFFLINE_GAME_SEC).not.toBe(GAME_DAY_GAME_SEC);
  });

  it("同一區間再結算產能為 0（冪等）", () => {
    const now = 60_000;
    const first = settleWindow({
      lastSettledAtMs: 0,
      nowRealMs: now,
      timeScale: 60,
      maxOfflineRealSec: 28800,
    });
    const second = settleWindow({
      lastSettledAtMs: first.nextLastSettledAtMs,
      nowRealMs: now,
      timeScale: 60,
      maxOfflineRealSec: 28800,
    });
    expect(second.gameDeltaSec).toBe(0);
  });
});

describe("生產結算", () => {
  it("工時到了才變 ready", () => {
    const running = settleProduction({
      status: "running",
      gameDeltaSec: 1800,
      queue: [
        {
          methodId: "m",
          durationGameSec: 3600,
          elapsedGameSec: 0,
          inputs: {},
          outputs: { item_wheat: 2 },
        },
      ],
    });
    expect(running.status).toBe("running");
    const done = settleProduction({
      status: "running",
      gameDeltaSec: 3600,
      queue: running.queue,
    });
    expect(done.status).toBe("ready");
    expect(done.completedOutputs.item_wheat).toBe(2);
    const alreadyReady = settleProduction({
      status: "ready",
      gameDeltaSec: 3600,
      queue: done.queue,
    });
    expect(alreadyReady.status).toBe("ready");
    expect(alreadyReady.completedOutputs).toEqual({});
  });
});

describe("規則生成與驗證", () => {
  it("農業切片屬性定義非空且 code 唯一", () => {
    expect(itemProperties.length).toBeGreaterThan(0);
    const codes = itemProperties.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(itemProperties.every((p) => p.value_kind === "number" || p.value_kind === "bool" || p.value_kind === "string")).toBe(
      true,
    );
  });

  it("農業切片由規則生成 5–10 種方式", () => {
    const methods = generateMethods(rules);
    expect(methods.length).toBeGreaterThanOrEqual(5);
    expect(methods.length).toBeLessThanOrEqual(10);
    expect(methods.every((m) => m.rule_id)).toBe(true);
    const errors = validateCatalog({ items, rules, methods });
    expect(errors).toEqual([]);
  });

  it("孤兒方式 V-METHOD 失敗", () => {
    const methods = generateMethods(rules);
    methods.push({
      id: "orphan",
      code: "orphan",
      rule_id: "",
      optimization: {},
      inputs: [],
      outputs: [],
      duration_game_sec: 1,
      is_active: true,
      released_in_version: "mvp",
    });
    const errors = validateCatalog({ items, rules, methods });
    expect(errors.some((e) => e.code === "V-METHOD")).toBe(true);
  });

  it("T 吃 P → V-T-P", () => {
    const bad = structuredClone(rules);
    bad[0].inputs = [{ item_id: "item_flour", qty: 1 }];
    const errors = validateCatalog({ items, rules: bad, methods: generateMethods(bad) });
    expect(errors.some((e) => e.code === "V-T-P")).toBe(true);
  });

  it("T 產出麵包 → V-SKIP", () => {
    const bad = structuredClone(rules);
    bad[0].outputs = [{ item_id: "item_bread", qty: 1 }];
    const errors = validateCatalog({ items, rules: bad, methods: generateMethods(bad) });
    expect(errors.some((e) => e.code === "V-SKIP")).toBe(true);
  });

  it("86400 當 cap → V-OFFLINE", () => {
    const methods = generateMethods(rules);
    const errors = validateCatalog({
      items,
      rules,
      methods,
      config: {
        timeScale: 60,
        maxOfflineRealSec: 86400,
        maxOfflineGameSec: 86400,
        gameDayGameSec: 86400,
      },
    });
    expect(errors.some((e) => e.code === "V-OFFLINE")).toBe(true);
  });
});
