/** Game `/state` poll cadence (J-UX-5: keep 2s). */
export const STATE_POLL_INTERVAL_MS = 2000;

/** Market + commodities refresh — slower than state to avoid商行／sparkline 2s 抖動 (v0.3 / #39). */
export const MARKET_POLL_INTERVAL_MS = 8000;

/** Retail offers — slightly slower than market; only while商行 panel + 零售 tab 開啟。 */
export const RETAIL_POLL_INTERVAL_MS = 10000;
