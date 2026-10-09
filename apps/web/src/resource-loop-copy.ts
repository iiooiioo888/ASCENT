/** LOCKED MVP：HUD 目標句（缺水／缺種指引） */
export const RESOURCE_LOOP_GOAL_HINT = "缺水用井；缺種留種。";

/** LOCKED MVP：低庫存弱提示閾值（水、種子） */
export const LOW_STOCK_THRESHOLD = 5;

export const WELL_BUILDING_DEF_ID = "bdef_well";
export const TRADING_POST_BUILDING_DEF_ID = "bdef_trading_post";
export const FIELD_BUILDING_DEF_ID = "bdef_field";
export const METHOD_DRAW_WATER_ID = "method_draw_water_default";
export const METHOD_SAVE_SEED_ID = "method_save_seed_default";

/** LOCKED MVP：水井閒置文案 */
export const WELL_IDLE_JOBLINE = "等待汲水";

/** LOCKED MVP：耗盡橫幅文案 */
export const DEPLETION_BANNER = {
  title: "生產已暫停：種子或水不足",
  body: "用水井汲水，或用小麥留種後即可繼續。",
  ctaWell: "前往水井",
  ctaSeed: "查看留種",
} as const;

/** LOCKED MVP：配方展示（與 shared catalog 簽核數值對齊） */
export const METHOD_RECIPE_DISPLAY: Record<string, { consume: string; produce: string }> = {
  method_draw_water_default: { consume: "—", produce: "💧水×5" },
  method_save_seed_default: { consume: "🌾小麥×2", produce: "🌱種子×1" },
};
