/** LAND-FE-1：莊外商行「擴田」文案（LD-D6）。 */
export const LAND_COPY = {
  tab: "擴田",
  title: "購買農田",
  subtitle: "用金幣加購一塊可開工的田，佔一個建築欄位。",
  priceLabel: "價格",
  fieldStatus: "農田",
  slotStatus: "建築欄位",
  cta: "擴田",
  pending: "處理中…",
  success: "已擴田，－🪙{n}",
  fieldAtCap: "農田已達上限",
  slotsFull: "建築欄位已滿",
  needGold: "金幣不足",
} as const;

export function landFieldStatusLabel(fieldCount: number, fieldCap: number): string {
  return `${fieldCount}／${fieldCap}`;
}

export function landSlotStatusLabel(buildingCount: number, buildingSlotCap: number): string {
  return `${buildingCount}／${buildingSlotCap}`;
}

export function landPurchaseSuccess(pricePaid: number): string {
  return LAND_COPY.success.replace("{n}", String(pricePaid));
}
