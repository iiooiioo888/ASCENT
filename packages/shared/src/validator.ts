import {
  GAME_DAY_GAME_SEC,
  MAX_OFFLINE_GAME_SEC,
  MAX_OFFLINE_REAL_SEC,
  TICK_INTERVAL_REAL_MS,
  TIME_SCALE,
} from "./config";
import type {
  ItemDef,
  ProductionMethodDef,
  ProductionRuleDef,
  ValidationError,
} from "./types";

export type CatalogSnapshot = {
  items: ItemDef[];
  rules: ProductionRuleDef[];
  methods: ProductionMethodDef[];
  config?: {
    timeScale: number;
    maxOfflineRealSec: number;
    maxOfflineGameSec: number;
    gameDayGameSec: number;
    tickIntervalRealMs?: number;
  };
};

const ALLOWED_FORMULA = /^[0-9a-zA-Z_.*+\-/ ()><=!,'"]+$/;

export function validateCatalog(snap: CatalogSnapshot): ValidationError[] {
  const errors: ValidationError[] = [];
  const items = new Map(snap.items.map((i) => [i.id, i]));
  const rules = new Map(snap.rules.map((r) => [r.id, r]));

  const cfg = snap.config ?? {
    timeScale: TIME_SCALE,
    maxOfflineRealSec: MAX_OFFLINE_REAL_SEC,
    maxOfflineGameSec: MAX_OFFLINE_GAME_SEC,
    gameDayGameSec: GAME_DAY_GAME_SEC,
  };

  if (cfg.timeScale !== TIME_SCALE) {
    errors.push({ code: "V-OFFLINE", message: "timeScale 必須為 60" });
  }
  if (cfg.maxOfflineRealSec !== MAX_OFFLINE_REAL_SEC) {
    errors.push({ code: "V-OFFLINE", message: "maxOfflineRealSec 必須為 28800" });
  }
  if (cfg.maxOfflineGameSec !== MAX_OFFLINE_GAME_SEC) {
    errors.push({ code: "V-OFFLINE", message: "maxOfflineGameSec 必須為 1728000" });
  }
  if (cfg.gameDayGameSec !== GAME_DAY_GAME_SEC) {
    errors.push({ code: "V-OFFLINE", message: "gameDayGameSec 必須為 86400" });
  }
  if (cfg.tickIntervalRealMs !== undefined && cfg.tickIntervalRealMs !== TICK_INTERVAL_REAL_MS) {
    errors.push({ code: "V-OFFLINE", message: "tickIntervalRealMs 必須為 5000" });
  }
  if (cfg.maxOfflineGameSec !== cfg.maxOfflineRealSec * cfg.timeScale) {
    errors.push({
      code: "V-OFFLINE",
      message: "maxOfflineGameSec 必須等於 maxOfflineRealSec × timeScale",
    });
  }
  if (cfg.maxOfflineRealSec === GAME_DAY_GAME_SEC || cfg.maxOfflineGameSec === GAME_DAY_GAME_SEC) {
    errors.push({ code: "V-OFFLINE", message: "不得用 86400 當入帳 cap" });
  }
  if (cfg.maxOfflineRealSec === 1440) {
    errors.push({ code: "V-OFFLINE", message: "不得用 1440 當入帳 cap" });
  }

  for (const rule of snap.rules) {
    if (!rule.is_active) continue;
    if (!rule.outputs?.length) {
      errors.push({ code: "V-OUT", message: `${rule.id} 沒有輸出` });
    }
    if (!Number.isInteger(rule.duration_game_sec) || rule.duration_game_sec < 1) {
      errors.push({ code: "V-TIME", message: `${rule.id} 工時非法` });
    }
    for (const [name, expr] of Object.entries(rule.formulas ?? {})) {
      if (!ALLOWED_FORMULA.test(expr)) {
        errors.push({ code: "V-FORMULA", message: `${rule.id}.${name} 非白名單` });
      }
    }
    if (rule.parent_rule_id) {
      const parent = rules.get(rule.parent_rule_id);
      if (!parent) errors.push({ code: "V-ID", message: `${rule.id} parent 不存在` });
      const depth = inheritanceDepth(rule.id, rules);
      if (depth > 10) errors.push({ code: "V-INH", message: `${rule.id} 繼承過深` });
      if (depth < 0) errors.push({ code: "V-CYCLE", message: `${rule.id} 繼承循環` });
    }
    for (const io of [...rule.inputs, ...rule.outputs]) {
      if (!items.has(io.item_id)) {
        errors.push({ code: "V-ID", message: `${rule.id} 引用未知物品 ${io.item_id}` });
      }
    }
    checkLayers(rule, items, errors);
  }

  for (const method of snap.methods) {
    if (!method.is_active) continue;
    if (!method.rule_id || !rules.has(method.rule_id)) {
      errors.push({ code: "V-METHOD", message: `${method.id} 孤兒或未知 rule_id` });
    } else if (!rules.get(method.rule_id)!.is_active) {
      errors.push({ code: "V-METHOD", message: `${method.id} 指向未啟用規則` });
    }
  }

  for (const item of snap.items) {
    if (!item.is_active) continue;
    const derived = deriveTier(item, snap.rules, items);
    if (derived !== null && derived !== item.derived_tier) {
      errors.push({
        code: "V-TIER",
        message: `${item.id} derived_tier=${item.derived_tier} 推導=${derived}`,
      });
    }
    if (item.layer === "T" && item.derived_tier >= 2 && item.is_active) {
      errors.push({ code: "V-ACTIVE", message: `T2 ${item.id} 不得啟用` });
    }
  }

  return errors;
}

function inheritanceDepth(
  id: string,
  rules: Map<string, ProductionRuleDef>,
  seen = new Set<string>(),
): number {
  if (seen.has(id)) return -1;
  seen.add(id);
  const rule = rules.get(id);
  if (!rule?.parent_rule_id) return 0;
  const parent = inheritanceDepth(rule.parent_rule_id, rules, seen);
  if (parent < 0) return -1;
  return parent + 1;
}

function checkLayers(
  rule: ProductionRuleDef,
  items: Map<string, ItemDef>,
  errors: ValidationError[],
): void {
  const ins = rule.inputs.map((i) => items.get(i.item_id)).filter(Boolean) as ItemDef[];
  const outs = rule.outputs.map((i) => items.get(i.item_id)).filter(Boolean) as ItemDef[];
  const tOut = outs.filter((i) => i.layer === "T");
  const pOut = outs.filter((i) => i.layer === "P");
  if (tOut.length && ins.some((i) => i.layer === "P")) {
    errors.push({ code: "V-T-P", message: `${rule.id} T 產出不得吃 P` });
  }
  if (pOut.length) {
    const maxPIn = Math.max(0, ...ins.filter((i) => i.layer === "P").map((i) => i.derived_tier));
    for (const out of pOut) {
      if (maxPIn === 0) {
        if (out.derived_tier !== 1) {
          errors.push({ code: "V-SKIP", message: `${rule.id} 僅 T 輸入卻不是 P1：${out.id}` });
        }
        continue;
      }
      if (out.derived_tier > maxPIn + 1) {
        errors.push({ code: "V-SKIP", message: `${rule.id} 跳級到 ${out.id}` });
      }
      if (out.derived_tier < maxPIn) {
        errors.push({ code: "V-DOWN", message: `${rule.id} 降級到 ${out.id}` });
      }
    }
  }
}

function deriveTier(
  item: ItemDef,
  rules: ProductionRuleDef[],
  items: Map<string, ItemDef>,
): number | null {
  const producing = rules.filter(
    (r) => r.is_active && r.outputs.some((o) => o.item_id === item.id),
  );
  if (!producing.length) return item.layer === "T" ? 1 : null;
  let max = 1;
  for (const rule of producing) {
    const ins = rule.inputs.map((i) => items.get(i.item_id)).filter(Boolean) as ItemDef[];
    if (item.layer === "T") {
      const tIns = ins.filter((i) => i.layer === "T");
      max = Math.max(max, tIns.length ? Math.max(...tIns.map((i) => i.derived_tier)) : 1);
    } else {
      const pIns = ins.filter((i) => i.layer === "P");
      if (!pIns.length) {
        max = 1;
      } else {
        const maxP = Math.max(...pIns.map((i) => i.derived_tier));
        max = item.derived_tier === maxP ? maxP : maxP + 1;
      }
    }
  }
  return max;
}
