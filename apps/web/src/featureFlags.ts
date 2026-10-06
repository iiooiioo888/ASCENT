/**
 * Product-facing feature toggles with optional Vite env overrides.
 * Defaults favor the least opinionated UX; flip env vars to restore legacy behavior.
 */

import { FEATURE_SHOW_DEPLETION_EMPTY_STATE as DEPLETION_DEFAULT } from "./productCopy";

export type SiloCardMode = "simplified" | "legacy";

const SILO_MODES: SiloCardMode[] = ["simplified", "legacy"];

function readEnvString(key: string): string | undefined {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return undefined;
  return String(raw);
}

function readEnvBool(key: string): boolean | undefined {
  const raw = readEnvString(key);
  if (raw === undefined) return undefined;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return undefined;
}

/** TODO(product): 待確認 — 倉卡呈現（simplified＝隱藏開工／停止／收取；legacy＝舊版完整卡） */
export function resolveSiloCardMode(): SiloCardMode {
  const raw = readEnvString("VITE_FEATURE_SILO_CARD_MODE");
  if (raw && SILO_MODES.includes(raw as SiloCardMode)) return raw as SiloCardMode;
  return "simplified";
}

/** TODO(product): 待確認 — 是否顯示「放置倉」空地卡（false＝隱藏放置入口） */
export function resolveShowSiloPlacement(): boolean {
  const env = readEnvBool("VITE_FEATURE_SHOW_SILO_PLACEMENT");
  if (env !== undefined) return env;
  return true;
}

export function resolveShowDepletionEmptyState(): boolean {
  const env = readEnvBool("VITE_FEATURE_SHOW_DEPLETION_EMPTY_STATE");
  if (env !== undefined) return env;
  return DEPLETION_DEFAULT;
}

export const FEATURE_SILO_CARD_MODE = resolveSiloCardMode();
export const FEATURE_SHOW_SILO_PLACEMENT = resolveShowSiloPlacement();
export const FEATURE_SHOW_DEPLETION_EMPTY_STATE = resolveShowDepletionEmptyState();
