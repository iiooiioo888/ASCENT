/**
 * Centralized player-facing copy and product placeholders for the agriculture MVP slice.
 * Swap strings here when product / planning confirms wording (search `TODO(product)`).
 */

/** 正式品牌顯示名（系統定義：遊戲名稱《帝國掘起》） */
export const BRAND_DISPLAY_NAME = "帝國掘起";

export const BRAND_SUBTITLE = "農、礦、化工、工業";

/** Browser tab title; keep in sync via `main.tsx` (single source with HUD brand). */
export const DOCUMENT_TITLE = `${BRAND_DISPLAY_NAME} · 農礦工商`;

/** TODO(product): 待確認 — 策劃簽核離線 HUD 文案（不承諾離線摘要行為，見 PR-E） */
export const OFFLINE_PROGRESS_HUD_CHIP = "🌙 離線最多補算 8 小時";

/** TODO(product): 待確認 — 離線進度說明（banner） */
export const OFFLINE_PROGRESS_BANNER =
  "離線期間最多補算 8 現實小時進度；每座建築同一時間只做一單，完成後需回來收取。";

/** TODO(product): 待確認 — 切片玩法說明 */
export const SLICE_FLOW_BANNER =
  "田種麥 → 磨坊磨粉／拌飼 → 爐和麵烤麵包。每個產業一張選項卡：農業、礦業、林木、化工、工業、能源。工時以遊戲秒計，現實約為六十分之一。";

/** TODO(product): 待確認 — 切片目標／終局出口說明 */
export const SLICE_GOAL_BANNER = "目標：做出第一個麵包（本切片尚無訂單或排行出口）。";

/** TODO(product): 待確認 — 耗盡橫幅標題（資源循環 §5.2 / U6） */
export const DEPLETION_EMPTY_TITLE = "生產已暫停：種子或水不足";

/** TODO(product): 待確認 — 耗盡橫幅說明 */
export const DEPLETION_EMPTY_BODY = "用水井汲水，或用小麥留種後即可繼續。";

/** 資源循環 v1.1：耗盡橫幅 CTA（開局預放水井，唔再引導放置） */
export const DEPLETION_CTA_WELL = "用水井汲水";

/** 資源循環 v1.1 */
export const DEPLETION_CTA_SAVE_SEED = "用小麥留種";

/** 市場 M-D13：耗盡時導向商行（與汲水／留種 CTA 並列） */
export const DEPLETION_CTA_MARKET = "前往商行";

/** TODO(product): 待確認 — 各生產方式用途提示（U13） */
export const METHOD_PURPOSE_HINTS: Partial<Record<string, string>> = {
  method_mix_feed_default: "飼料可送牧場養雞牛，或送化工廠與鹼製成肥料。",
  method_raise_livestock_default: "消耗飼料與水，產出雞蛋與牛奶。",
  method_bake_cake_default: "消耗麵粉、雞蛋與牛奶，產出蛋糕。",
  method_mine_iron_default: "礦坑無原料消耗，開採後送冶煉爐。",
  method_mine_coal_default: "煤是冶煉、燒窯與煉焦的燃料。",
};

/** TODO(product): 待確認 — 背包物品用途提示（U13） */
export const ITEM_PURPOSE_HINTS: Partial<Record<string, string>> = {
  item_feed: "可送牧場養雞牛，或與鹼在化工廠製成肥料。",
  item_straw: "可送進窯燒成木炭，或與小麥拌成飼料。",
  item_bread: "麵包是農產終產；可留存或在商行出售。",
  item_egg: "牧場產出；可留存或在商行出售。",
  item_milk: "牧場產出；可留存或在商行出售。",
  item_cake: "食品廠終產；可在商行出售（貨架仍只賣麵包）。",
  item_coal: "冶煉、燒窯與煉焦的燃料。",
  item_fertilizer: "化工終產；可在商行出售。",
  item_machine: "工業終產；齒輪、銅線與工具組裝而成。",
  item_engine: "需要鋼、齒輪與蒸汽。",
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

/** 產業選項卡內的產品區標題。 */
export function industryPackTitle(label: string): string {
  return `${label}產品`;
}

export const INDUSTRY_PACK_EMPTY = "此產業還沒有產品";

/** Decorative industry chain strip (U15, P3-3 含飼料與牧場支線). 一次只描述目前選項卡。 */
export const INDUSTRY_CHAIN_ARIA_LABEL =
  "農業產業鏈：田、磨坊、爐至麵包；磨坊可產飼料，飼料送牧場產蛋奶";

export const INDUSTRY_CHAIN_ARIA_BY_ID = {
  agriculture: INDUSTRY_CHAIN_ARIA_LABEL,
  mining: "礦業產業鏈：礦坑、冶煉爐至鋼",
  timber: "林木產業鏈：林地至原木",
  chemical: "化工產業鏈：窯、化工廠至肥料",
  industry:
    "工業產業鏈：工坊、機械廠至機械；麵粉與蛋奶送食品廠焗蛋糕；機械廠可產蒸汽機",
  energy: "能源產業鏈：鍋爐至蒸汽",
} as const;

/** AFK per-building recipe `<select>` (P4-S1). */
export function autoMethodSelectAriaLabel(buildingName: string): string {
  return `選擇${buildingName}的掛機配方`;
}

export const AUTO_METHOD_DEFAULT_OPTION_LABEL = "預設";

/** TODO(product): 待確認 — 倉卡說明（U12 精簡卡） */
export const SILO_CARD_BODY = "倉庫已隱藏：僅保留既有建築展示，無法再放置。";

/** TODO(product): 待確認 — 時間換算 HUD chip 文案（P3-1） */
export function timeScaleHudChip(timeScale: number): string {
  if (timeScale === 60) return "⚖ 1 現實秒＝1 遊戲分";
  return `⚖ 1 現實秒＝${timeScale} 遊戲秒`;
}

/** Secondary game-clock label prefix (P3-1). */
export const GAME_TIME_CHIP_PREFIX = "遊戲時";
