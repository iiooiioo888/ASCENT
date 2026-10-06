/**
 * Player-facing disclaimer about whether inputs are refunded when stopping production.
 *
 * TODO(product): Awaiting product confirmation — do not assert refund or non-refund in the UI
 * until policy is decided. Wire this constant into {@link StopConfirmDialog} when copy is approved.
 */
export const STOP_CONFIRM_REFUND_DISCLAIMER = "";

/** Neutral body copy (no refund commitment). */
export function stopConfirmIntro(buildingName: string, methodLabel: string): string {
  return `${buildingName} 正在進行「${methodLabel}」。若確認停止，下列開工時已從背包扣減的資源將不再用於本次生產，進行中的工時與尚未入帳的產出也會結束：`;
}
