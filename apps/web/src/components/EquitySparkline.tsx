import type { PriceHistoryPoint } from "../equity";

type Props = {
  history: PriceHistoryPoint[];
  width?: number;
  height?: number;
  className?: string;
};

/** 簡易 SVG sparkline（EQ-D12）；空或單點不崩。 */
export function EquitySparkline({ history, width = 88, height = 28, className }: Props) {
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  if (!history.length) {
    return (
      <svg
        className={className ?? "equity-sparkline"}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="價格走勢"
        data-testid="equity-sparkline-empty"
      >
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={1}
        />
      </svg>
    );
  }

  const prices = history.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;

  const points = history.map((p, i) => {
    const x =
      history.length === 1
        ? width / 2
        : padding + (i / (history.length - 1)) * innerW;
    const y = padding + innerH - ((p.price - min) / span) * innerH;
    return `${x},${y}`;
  });

  return (
    <svg
      className={className ?? "equity-sparkline"}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="價格走勢"
      data-testid="equity-sparkline"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(" ")}
      />
    </svg>
  );
}
