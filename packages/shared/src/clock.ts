import { TIME_SCALE } from "./config";
import type { WorldClock } from "./types";

export function displayGameTime(
  clock: WorldClock,
  nowMs: number,
  timeScale = TIME_SCALE,
): number {
  return clock.startGameTime + ((nowMs - clock.startRealTimeMs) / 1000) * timeScale;
}
