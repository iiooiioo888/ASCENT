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

/** TODO(product): 待確認 — 資源耗盡標題（U6 中性空狀態，不發明重置或加資源機制） */
export const DEPLETION_EMPTY_TITLE = "本切片資源已用盡";

/** TODO(product): 待確認 — 耗盡後下一步說明 */
export const DEPLETION_EMPTY_BODY =
  "目前所有已放置建築的生產方式都缺料，且沒有進行中或待收取的工作。完整版可能會有水源或育種途徑；若需繼續遊玩，請等待策劃／核心開發更新資料。";

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

/** TODO(product): 待確認 — 離線摘要方案 A/B（A＝localStorage 比對；off＝關閉；B＝日後 API 摘要） */
export type OfflineSummaryFeatureMode = "A" | "off";

export const FEATURE_OFFLINE_SUMMARY: OfflineSummaryFeatureMode = "A";

/** TODO(product): 待確認 — 離線歸來摘要標題與整段排版（UX §E 示例以「離開期間：…」描述；標題／內文分工待策劃定案） */
export const OFFLINE_SUMMARY_TITLE = "離開期間";

/** Small tag shown beside the summary title while product picks A vs API (B). */
export const OFFLINE_SUMMARY_PENDING_TAG = "待確認";

export const OFFLINE_SUMMARY_DISMISS_LABEL = "知道了";

/** Wording aligned with OFFLINE_PROGRESS_BANNER — no backend settlement promise. */
export const OFFLINE_SUMMARY_FOOTNOTE =
  "此為本機上次畫面與目前狀態的前端比對，並非後端結算紀錄。離線最多補算 8 現實小時；每座建築同一時間只做一單，完成後需回來收取。";

export function methodPurposeHint(methodId: string | undefined): string | undefined {
  if (!methodId) return undefined;
  return METHOD_PURPOSE_HINTS[methodId];
}

export function itemPurposeHint(itemId: string): string | undefined {
  return ITEM_PURPOSE_HINTS[itemId];
}

/** Shown after repeated poll failures while the game view is open (U10). */
export const CONNECTION_INTERRUPTED_BANNER = "連線中斷，重試中…";

/** Initial load failure heading (U10). */
export const CONNECTION_LOAD_FAILED_TITLE = "無法連接伺服器";

export const CONNECTION_RETRY_BUTTON_LABEL = "重試";

/** Shown under load error when API reports unseeded world clock (developer hint). */
export const CONNECTION_LOAD_SEED_HINT = "若為本地開發，請先執行 pnpm setup:db 並啟動 API。";

export function isUnseededWorldClockError(message: string): boolean {
  return message.includes("尚未種子世界時鐘");
}

/** Accessible name for per-building production method `<select>` (U15). */
export function methodSelectAriaLabel(buildingName: string): string {
  return `選擇${buildingName}的生產方式`;
}

/** `aria-label` for building / production progress bars (U15). */
export function productionProgressAriaLabel(buildingName: string, percent: number): string {
  return `${buildingName}生產進度 ${percent}%`;
}

/** Decorative industry chain strip (U15). */
export const INDUSTRY_CHAIN_ARIA_LABEL = "產業鏈：田、磨坊、爐至麵包";
