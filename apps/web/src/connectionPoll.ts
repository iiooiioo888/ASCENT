import { STATE_POLL_INTERVAL_MS } from "./gamePoll";

/** Consecutive failed GET /state polls before showing the connection bar (2s interval → ≈6s). */
export const POLL_FAILURE_THRESHOLD = 3;

/** @deprecated use STATE_POLL_INTERVAL_MS */
export const POLL_INTERVAL_MS = STATE_POLL_INTERVAL_MS;

export function nextPollFailureCount(current: number, failed: boolean): number {
  if (!failed) return 0;
  return current + 1;
}

export function shouldShowConnectionLost(consecutiveFailures: number): boolean {
  return consecutiveFailures >= POLL_FAILURE_THRESHOLD;
}
