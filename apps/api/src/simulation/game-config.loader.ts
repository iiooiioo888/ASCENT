import { gameConfigFromDb, type GameConfigValues } from "@ascent/shared";
import type { GameConfig } from "@prisma/client";

export function gameConfigFromRow(row: GameConfig | null): GameConfigValues {
  if (!row) return gameConfigFromDb(null);
  return gameConfigFromDb({
    timeScale: row.timeScale,
    gameDayGameSec: row.gameDayGameSec,
    maxOfflineRealSec: row.maxOfflineRealSec,
    maxOfflineGameSec: row.maxOfflineGameSec,
    tickIntervalRealMs: row.tickIntervalRealMs,
  });
}
