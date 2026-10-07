/** 停止生產確認（U4）；產品 v1.1：停止唔退還已扣輸入，對話框列損失。 */
export function stopConfirmIntro(buildingName: string, methodLabel: string): string {
  return `${buildingName} 正在進行「${methodLabel}」。若確認停止，下列已投入資源將失去，進行中的工時與尚未入帳的產出也會結束：`;
}

export function stopConfirmLossHeading(): string {
  return "將失去";
}
