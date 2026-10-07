/**
 * 產品已拍板：停止生產不退還已扣輸入。{@link STOP_CONFIRM_REFUND_DISCLAIMER} 維持空字串，不主張可退。
 */
export const STOP_CONFIRM_REFUND_DISCLAIMER = "";

/** 列明將失去的輸入（不退還）。 */
export function stopConfirmIntro(buildingName: string, methodLabel: string): string {
  return `${buildingName} 正在進行「${methodLabel}」。若確認停止，下列開工時已從背包扣減的資源將失去，進行中的工時與尚未入帳的產出也會結束：`;
}
