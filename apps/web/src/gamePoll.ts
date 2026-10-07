/** Game `/state` poll cadence (J-UX-5: keep 2s). */
export const STATE_POLL_INTERVAL_MS = 2000;

/** Market + commodities refresh — slower than state to avoid商行／sparkline 2s 抖動 (v0.3). */
export const MARKET_POLL_INTERVAL_MS = 8000;
