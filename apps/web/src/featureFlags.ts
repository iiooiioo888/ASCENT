/**
 * Product-facing feature toggles with optional Vite env overrides.
 * Defaults favor the least opinionated UX; flip env vars to restore legacy behavior.
 */

import { FEATURE_SHOW_DEPLETION_EMPTY_STATE, parseViteBooleanEnv } from "./productCopy";

export { FEATURE_SHOW_DEPLETION_EMPTY_STATE };

export type SiloCardMode = "simplified" | "legacy";

const SILO_MODES: SiloCardMode[] = ["simplified", "legacy"];

function readEnvString(key: string): string | undefined {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return undefined;
  return String(raw);
}

/** TODO(product): 待確認 — 倉卡呈現（simplified＝隱藏開工／停止／收取；legacy＝舊版完整卡） */
export function resolveSiloCardMode(): SiloCardMode {
  const raw = readEnvString("VITE_FEATURE_SILO_CARD_MODE");
  if (raw && SILO_MODES.includes(raw as SiloCardMode)) return raw as SiloCardMode;
  return "simplified";
}

/** P-D3 LOCKED：倉庫隱藏、不佔槽；預設不顯示放置入口（env `true` 可恢復舊行為）。 */
export function resolveShowSiloPlacement(): boolean {
  return parseViteBooleanEnv(import.meta.env.VITE_FEATURE_SHOW_SILO_PLACEMENT, false);
}

export const FEATURE_SILO_CARD_MODE = resolveSiloCardMode();
export const FEATURE_SHOW_SILO_PLACEMENT = resolveShowSiloPlacement();
