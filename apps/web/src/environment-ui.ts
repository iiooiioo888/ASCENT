import {
  applyOutputFactor,
  applySeedGenerationToGrowOutputs,
  fieldCultivationOutputFactor,
  GROW_WHEAT_RULE_ID,
  isFieldGrowRuleId,
  iosToRecord,
  scaleOutputsByYield,
} from "@ascent/shared";

/** 與 poll 間插值一致：由 state.time 推算當前遊戲秒。 */
export function smoothCurrentGameSec(
  displayGameTime: number,
  timeScale: number,
  serverRealTime: string,
  nowMs = Date.now(),
): number {
  const serverMs = Date.parse(serverRealTime);
  if (!Number.isFinite(serverMs)) return displayGameTime;
  const deltaRealSec = Math.max(0, (nowMs - serverMs) / 1000);
  return displayGameTime + deltaRealSec * timeScale;
}

export function fallowRemainRealSec(
  fallowUntil: number,
  displayGameTime: number,
  timeScale: number,
  serverRealTime: string,
  nowMs = Date.now(),
): number {
  if (timeScale <= 0) return 0;
  const current = smoothCurrentGameSec(displayGameTime, timeScale, serverRealTime, nowMs);
  return Math.max(0, (fallowUntil - current) / timeScale);
}

export function isFieldFallow(buildingDefId: string, fallowUntil?: number): boolean {
  return buildingDefId === "bdef_field" && typeof fallowUntil === "number";
}

export function scaledGrowOutputsPreview(
  ruleId: string,
  outputs: { item_id: string; qty: number }[],
  yieldMult: number,
  opts?: { seedGeneration?: number; cultivation?: string | null },
): { item_id: string; qty: number }[] {
  let rec = iosToRecord(outputs);
  if (ruleId === GROW_WHEAT_RULE_ID && (opts?.seedGeneration ?? 0) > 0) {
    rec = applySeedGenerationToGrowOutputs(rec, opts?.seedGeneration ?? 0);
  }
  if (isFieldGrowRuleId(ruleId)) {
    rec = applyOutputFactor(rec, fieldCultivationOutputFactor(opts?.cultivation));
  }
  if (isFieldGrowRuleId(ruleId) && yieldMult !== 1) {
    rec = scaleOutputsByYield(rec, yieldMult);
  }
  return outputs.map((o) => ({ item_id: o.item_id, qty: rec[o.item_id] ?? o.qty }));
}
