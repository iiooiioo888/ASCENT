import { ApiError } from "./api";

/**
 * Stable error codes for building action races (collect/start/stop).
 * UX copy for all rows: `BUILDING_STATE_CHANGED_COPY` in format.ts.
 *
 * | Code | Typical HTTP | Meaning (backend) | Card copy |
 * |------|--------------|-------------------|-----------|
 * | building_state_conflict | 409 | Optimistic update lost / concurrent action (PR #8+) | 狀態已變更，已重新整理 |
 * | building_not_ready_to_collect | 400 | Collect while not `ready` (main) | 狀態已變更，已重新整理 |
 * | building_busy_or_ready | 400 | Start while not `idle` (main) | 狀態已變更，已重新整理 |
 */
export const STALE_BUILDING_ACTION_CODES = {
  STATE_CONFLICT: "building_state_conflict",
  NOT_READY_TO_COLLECT: "building_not_ready_to_collect",
  BUSY_OR_READY: "building_busy_or_ready",
} as const;

export type StaleBuildingActionCode =
  (typeof STALE_BUILDING_ACTION_CODES)[keyof typeof STALE_BUILDING_ACTION_CODES];

const STALE_CODE_SET: ReadonlySet<string> = new Set(Object.values(STALE_BUILDING_ACTION_CODES));

/**
 * TODO(backend): remove when race responses always include `code` from STALE_BUILDING_ACTION_CODES.
 * Temporary map from Nest `message` on HTTP 400 → stable code (main backend today).
 */
export const STALE_BUILDING_ACTION_MESSAGE_ALIASES: Readonly<
  Record<string, StaleBuildingActionCode>
> = {
  尚無可收取產出: STALE_BUILDING_ACTION_CODES.NOT_READY_TO_COLLECT,
  建築忙碌或待收取: STALE_BUILDING_ACTION_CODES.BUSY_OR_READY,
};

export function resolveStaleBuildingActionCode(error: ApiError): StaleBuildingActionCode | null {
  if (error.code && STALE_CODE_SET.has(error.code)) {
    return error.code as StaleBuildingActionCode;
  }
  if (error.status === 409) {
    return STALE_BUILDING_ACTION_CODES.STATE_CONFLICT;
  }
  if (error.status === 400) {
    return STALE_BUILDING_ACTION_MESSAGE_ALIASES[error.message] ?? null;
  }
  return null;
}

export function isStaleBuildingActionError(raw: unknown): boolean {
  return raw instanceof ApiError && resolveStaleBuildingActionCode(raw) !== null;
}
