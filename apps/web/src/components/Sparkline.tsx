import type { PriceHistoryPoint } from "../commodities";
import { buildSparklinePath } from "../sparkline";

type Props = {
  priceHistory: ReadonlyArray<PriceHistoryPoint>;
  width?: number;
  height?: number;
  className?: string;
  testId?: string;
};

export function Sparkline({
  priceHistory,
  width = 88,
  height = 28,
  className = "",
  testId = "commodity-sparkline",
}: Props) {
  const path = buildSparklinePath(priceHistory, width, height);
  const last = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1]!.price : null;

  return (
    <svg
      className={`commodity-sparkline ${className}`.trim()}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={last !== null ? `近期價格約 ${last}` : "近期價格折線"}
      data-testid={testId}
    >
      <path className="commodity-sparkline-path" d={path} fill="none" />
    </svg>
  );
}
