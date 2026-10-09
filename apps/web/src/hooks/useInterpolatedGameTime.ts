import { useMemo } from "react";
import { useProgressTick } from "./useProgressTick";

/** 在 state poll 之間用現實時間 × timeScale 插值遊戲秒（頂欄 tick 用）。 */
export function useInterpolatedGameTime(
  displayGameTime: number,
  timeScale: number,
  serverRealTime: string,
): number {
  const tickMs = useProgressTick(true, 1000);
  const anchorMs = useMemo(() => Date.parse(serverRealTime), [serverRealTime]);

  return useMemo(() => {
    if (!Number.isFinite(anchorMs)) return displayGameTime;
    const elapsedRealSec = Math.max(0, (tickMs - anchorMs) / 1000);
    return displayGameTime + elapsedRealSec * timeScale;
  }, [displayGameTime, timeScale, anchorMs, tickMs]);
}
