import { ITEM_META, itemLabel } from "./meta";
import { isStaleBuildingActionError } from "./stale-building-action";

/** Shown on building card after HTTP 409 (concurrent start/stop/collect). */
export const BUILDING_STATE_CHANGED_COPY = "狀態已變更，已重新整理";

/** Integers show no decimals; otherwise up to 2 decimal places, trailing zeros trimmed. */
export function formatQuantity(qty: number): string {
  if (!Number.isFinite(qty)) return "0";
  const rounded = Math.round(qty);
  if (Math.abs(qty - rounded) < 1e-9) return String(rounded);
  const fixed = qty.toFixed(2).replace(/\.?0+$/, "");
  return fixed;
}

export function fmtIo(ios: { item_id: string; qty: number }[]) {
  return ios
    .map((io) => `${ITEM_META[io.item_id]?.icon ?? ""} ${itemLabel(io.item_id)}×${formatQuantity(io.qty)}`)
    .join("  ");
}

export function fmtBuffered(buf: Record<string, number>) {
  const parts = Object.entries(buf)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => `${ITEM_META[id]?.icon ?? ""} ${itemLabel(id)}×${formatQuantity(q)}`);
  return parts.length ? parts.join("  ") : "（無）";
}

const ITEM_ID_PATTERN = /item_[a-z0-9_]+/gi;

/** Strip Error: prefix and map item_* ids to display names for player-facing copy. */
export function formatUserError(raw: unknown): string {
  let msg = raw instanceof Error ? raw.message : String(raw);
  msg = msg.replace(/^Error:\s*/i, "");
  msg = msg.replace(ITEM_ID_PATTERN, (id) => itemLabel(id));
  return msg;
}

/** Player-facing copy for failed building actions (card-level). */
export function formatActionError(raw: unknown): string {
  if (isStaleBuildingActionError(raw)) {
    return BUILDING_STATE_CHANGED_COPY;
  }
  return formatUserError(raw);
}

export function fmtGame(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}日 ${h}時 ${m}分`;
}

export function realRemainSec(job?: { elapsedGameSec: number; durationGameSec: number }, timeScale = 60) {
  if (!job) return 0;
  return Math.max(0, (job.durationGameSec - job.elapsedGameSec) / timeScale);
}

export function statusLabel(status: string) {
  if (status === "running") return "生產中";
  if (status === "ready") return "待收取";
  return "閒置";
}
