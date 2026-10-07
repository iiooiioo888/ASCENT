import type { PriceHistoryPoint } from "./commodities";

export function buildSparklinePath(
  points: ReadonlyArray<Pick<PriceHistoryPoint, "price">>,
  width: number,
  height: number,
  padding = 2,
): string {
  const innerW = Math.max(0, width - padding * 2);
  const innerH = Math.max(0, height - padding * 2);

  if (points.length === 0) {
    const y = padding + innerH / 2;
    return `M ${padding} ${y} L ${padding + innerW} ${y}`;
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = padding + innerH - ((p.price - min) / range) * innerH;
    return { x, y };
  });

  return coords
    .map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`))
    .join(" ");
}

export function formatCommodityChange(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return String(change);
  return "0";
}
