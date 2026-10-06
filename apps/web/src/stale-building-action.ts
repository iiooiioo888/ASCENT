import { ApiError } from "./api";

/**
 * Exact `message` strings from `apps/api` `BadRequestException` on main (pre–PR #8).
 * Same races become HTTP 409 after PR #8 — delete this list once backend only uses 409.
 */
export const STALE_BUILDING_ACTION_MESSAGES: readonly string[] = [
  "尚無可收取產出",
  "建築忙碌或待收取",
];

export function isStaleBuildingActionError(raw: unknown): boolean {
  if (!(raw instanceof ApiError)) return false;
  if (raw.status === 409) return true;
  if (raw.status !== 400) return false;
  return STALE_BUILDING_ACTION_MESSAGES.includes(raw.message);
}
