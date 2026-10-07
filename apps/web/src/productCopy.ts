/**
 * Centralized player-facing copy and product placeholders for the agriculture MVP slice.
 * Swap strings here when product / planning confirms wording (search `TODO(product)`).
 */

/** TODO(product): 待確認 — 正式品牌顯示名（崗起 vs 崛起） */
export const BRAND_DISPLAY_NAME = "崛起";

export const BRAND_SUBTITLE = "農業切片 · 莊園";

/** TODO(product): 待確認 — 策劃簽核離線 HUD 文案（不承諾離線摘要行為，見 PR-E） */
export const OFFLINE_PROGRESS_HUD_CHIP = "🌙 離線最多補算 8 小時";

/** TODO(product): 待確認 — 離線進度說明（banner） */
export const OFFLINE_PROGRESS_BANNER =
  "離線期間最多補算 8 現實小時進度；每座建築同一時間只做一單，完成後需回來收取。";

/** TODO(product): 待確認 — 切片玩法說明 */
export const SLICE_FLOW_BANNER =
  "田種麥 → 磨坊磨粉／拌飼 → 爐和麵烤麵包。工時以遊戲秒計，現實約為六十分之一。";

/** TODO(product): 待確認 — 切片目標／終局出口說明 */
export const SLICE_GOAL_BANNER = "目標：做出第一個麵包（本切片尚無訂單或排行出口）。";

/** TODO(product): 待確認 — 耗盡橫幅標題（資源循環 §5.2 / U6） */
export const DEPLETION_EMPTY_TITLE = "生產已暫停：種子或水不足";

/** TODO(product): 待確認 — 耗盡橫幅說明 */
export const DEPLETION_EMPTY_BODY = "用水井汲水，或用小麥留種後即可繼續。";

/** TODO(product): 待確認 — 耗盡橫幅 CTA */
export const DEPLETION_CTA_WELL = "用水井汲水";

/** TODO(product): 待確認 — 耗盡橫幅 CTA */
export const DEPLETION_CTA_SAVE_SEED = "用小麥留種";

/** TODO(product): 待確認 — 各生產方式用途提示（U13） */
export const METHOD_PURPOSE_HINTS: Partial<Record<string, string>> = {
  method_mix_feed_default: "飼料：目前沒有下游用途，可先略過。",
};

/** TODO(product): 待確認 — 背包物品用途提示（U13） */
export const ITEM_PURPOSE_HINTS: Partial<Record<string, string>> = {
  item_feed: "目前沒有下游用途。",
  item_bread: "終產；本切片目標是做出並留存麵包。",
};

/** Parses Vite env booleans (case-insensitive, trimmed). Empty/whitespace → default; unknown tokens → default. */
export function parseViteBooleanEnv(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  return defaultValue;
}

/**
 * When false, hide the depletion banner (logic still testable).
 * Override at build/dev time: `VITE_FEATURE_SHOW_DEPLETION_EMPTY_STATE=false`.
 * TODO(product): 待確認 — 是否永遠顯示耗盡提示
 */
export const FEATURE_SHOW_DEPLETION_EMPTY_STATE = parseViteBooleanEnv(
  import.meta.env.VITE_FEATURE_SHOW_DEPLETION_EMPTY_STATE,
  true,
);

export function methodPurposeHint(methodId: string | undefined): string | undefined {
  if (!methodId) return undefined;
  return METHOD_PURPOSE_HINTS[methodId];
}

export function itemPurposeHint(itemId: string): string | undefined {
  return ITEM_PURPOSE_HINTS[itemId];
}
