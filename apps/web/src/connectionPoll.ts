/** Consecutive failed GET /state polls before showing the connection bar (2s interval → ≈6s). */
export const POLL_FAILURE_THRESHOLD = 3;

export function nextPollFailureCount(current: number, failed: boolean): number {
  if (!failed) return 0;
  return current + 1;
}

export function shouldShowConnectionLost(consecutiveFailures: number): boolean {
  return consecutiveFailures >= POLL_FAILURE_THRESHOLD;
}
