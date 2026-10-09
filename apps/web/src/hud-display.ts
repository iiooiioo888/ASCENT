import type { WorkforceSnapshot } from "./types";
import { fmtGame } from "./format";

/** FE-RICH-4：頂欄工位摘要（聘／忙／上限，僅用 state 欄位）。 */
export function workforceHudSummaryLabel(workforce: WorkforceSnapshot): string {
  const hired = workforce.hired;
  const busy = typeof workforce.busy === "number" ? workforce.busy : 0;
  const cap = workforce.maxHired;
  return `👷 ${hired}/${cap}·忙${busy}`;
}

/** FE-RICH-4：頂欄精簡遊戲時鐘（唔重複「遊戲時」長前缀）。 */
export function fmtHudGameClockCompact(displayGameSec: number): string {
  return `⏱ ${fmtGame(displayGameSec)}`;
}

/** 頂欄最近動態入口：截斷 toast，避免撑爆 chip。 */
export function hudRecentActivityLabel(message: string, maxLen = 18): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxLen) return `📣 ${trimmed}`;
  return `📣 ${trimmed.slice(0, maxLen - 1)}…`;
}

/** 主要 HUD chip 上限（三錠 + 最多兩項摘要）。 */
export const HUD_PRIMARY_CHIP_LIMIT = 5;
