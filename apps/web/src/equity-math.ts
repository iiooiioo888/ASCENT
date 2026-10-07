/** 客端預覽用；與 EQ-D5／shared EQUITY_CONFIG 對齊（BE 未合時仍可用預設）。 */
export const DEFAULT_EQUITY_CAPS = {
  feeRate: 0.02,
  minFeeGold: 1,
  maxSharesPerEquity: 50,
  maxQtyPerOrder: 10,
} as const;

export function computeEquityFee(
  notional: number,
  feeRate: number = DEFAULT_EQUITY_CAPS.feeRate,
  minFeeGold: number = DEFAULT_EQUITY_CAPS.minFeeGold,
): number {
  return Math.max(minFeeGold, Math.round(notional * feeRate));
}

export function equityBuyTotalGold(unitPrice: number, quantity: number, feeRate: number, minFeeGold: number): number {
  const notional = unitPrice * quantity;
  return notional + computeEquityFee(notional, feeRate, minFeeGold);
}

export function equitySellNetGold(unitPrice: number, quantity: number, feeRate: number, minFeeGold: number): number {
  const notional = unitPrice * quantity;
  const fee = computeEquityFee(notional, feeRate, minFeeGold);
  return notional - fee;
}

export function maxAffordableEquityQty(
  gold: number,
  unitPrice: number,
  feeRate: number,
  minFeeGold: number,
  cap: number,
): number {
  if (unitPrice <= 0 || gold < unitPrice) return 0;
  let best = 0;
  for (let q = 1; q <= cap; q++) {
    if (equityBuyTotalGold(unitPrice, q, feeRate, minFeeGold) <= gold) best = q;
    else break;
  }
  return best;
}

export function formatEquityChange(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return String(change);
  return "0";
}
