/** TODO(product): 待確認 HUD 目標句（缺水／缺種指引） */
export const RESOURCE_LOOP_GOAL_HINT = "缺水用井；缺種留種。";

/** TODO(product): 待確認低庫存弱提示閾值（水、種子） */
export const LOW_STOCK_THRESHOLD = 5;

export const WELL_BUILDING_DEF_ID = "bdef_well";
export const FIELD_BUILDING_DEF_ID = "bdef_field";
export const METHOD_DRAW_WATER_ID = "method_draw_water_default";
export const METHOD_SAVE_SEED_ID = "method_save_seed_default";

/** TODO(product): 待確認水井閒置文案 */
export const WELL_IDLE_JOBLINE = "等待汲水";

/** TODO(product): 待確認耗盡橫幅文案（完整 U6 對齊見 RL-FE-2 / PR #9） */
export const DEPLETION_BANNER = {
  title: "生產已暫停：種子或水不足",
  body: "用水井汲水，或用小麥留種後即可繼續。",
  ctaWell: "用水井汲水",
  ctaSeed: "用小麥留種",
} as const;

/** 開局由 BE seed 預放水井；前端不提供放置水井空地卡（規格 v1.1）。 */
export function isBuildingDefPlaceableInUi(defId: string): boolean {
  return defId !== WELL_BUILDING_DEF_ID;
}

/**
 * TODO(product): 待確認配方展示（與 shared catalog 佔位數值對齊）
 * @see packages/shared/src/agriculture-catalog.ts PLACEHOLDER_*
 */
export const METHOD_RECIPE_DISPLAY: Record<string, { consume: string; produce: string }> = {
  method_draw_water_default: { consume: "—", produce: "💧水×5" },
  method_save_seed_default: { consume: "🌾小麥×2", produce: "🌱種子×1" },
};
