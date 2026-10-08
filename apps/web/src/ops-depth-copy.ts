/** R1 經營深度（人力＋開工費用）文案 — 對齊 UX §7 */
export const OPS_DEPTH_COPY = {
  workforceHud: (free: number, hired: number) => `👷 ${free}/${hired}`,
  hire: "僱工",
  hirePreview: (cost: number) => `支付 🪙${cost}，工位＋1`,
  needHands: "人手不足：請僱工或等待完工",
  workforceCap: "已達僱工上限",
  needGold: "銅錠不足",
  wage: "工資",
  haul: "運費",
  net: "實收",
  sellTransportTooHigh: "運費高於售價，無法賣出",
  labor: "人手",
  opsHint: "請人可同時開工；加工與賣貨需付運費。",
} as const;
