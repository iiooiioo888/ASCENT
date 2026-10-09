/** 客單槽位與剩餘有效時間（FE-RICH-3）。 */

export function retailSlotSummary(filled: number, total: number): string {
  const safeTotal = Math.max(1, total);
  const safeFilled = Math.max(0, Math.min(filled, safeTotal));
  return `槽位 ${safeFilled}／${safeTotal}`;
}

export function retailSlotLabel(index: number): string {
  return `槽位 ${index}`;
}

export function retailOfferRemainSec(expiresAt: number | undefined, nowMs: number): number | null {
  if (expiresAt == null || !Number.isFinite(expiresAt)) return null;
  return Math.max(0, Math.ceil((expiresAt - nowMs) / 1000));
}

/** 玩家可讀的剩餘有效時間；無 expiresAt 時顯示「—」。 */
export function formatRetailOfferRemaining(
  expiresAt: number | undefined,
  nowMs: number,
): string {
  const sec = retailOfferRemainSec(expiresAt, nowMs);
  if (sec == null) return "—";
  if (sec <= 0) return "已過期";
  if (sec < 60) return `剩餘 ${sec} 秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `剩餘 ${h} 時 ${rm} 分` : `剩餘 ${h} 時`;
  }
  return s > 0 ? `剩餘 ${m} 分 ${s} 秒` : `剩餘 ${m} 分`;
}
