/** Stop does not refund inputs (resource-loop v1.1); loss list follows in the dialog. */
export function stopConfirmIntro(buildingName: string, methodLabel: string): string {
  return `${buildingName} 正在進行「${methodLabel}」。若確認停止，下列已投入的資源將失去，進行中的工時與尚未入帳的產出也會結束：`;
}
