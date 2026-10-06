export const TIME_SCALE = 60;
export const GAME_DAY_GAME_SEC = 86400;
export const MAX_OFFLINE_REAL_SEC = 28800;
export const MAX_OFFLINE_GAME_SEC = MAX_OFFLINE_REAL_SEC * TIME_SCALE;
export const TICK_INTERVAL_REAL_MS = 5000;
export const LOCAL_PLAYER_ID = "player_local";
export const QUEUE_LIMIT_MVP = 1;
export const RELEASED_IN_VERSION = "mvp";

export type GameConfigValues = {
  timeScale: number;
  gameDayGameSec: number;
  maxOfflineRealSec: number;
  maxOfflineGameSec: number;
  tickIntervalRealMs: number;
};

export const GAME_CONFIG: GameConfigValues = {
  timeScale: TIME_SCALE,
  gameDayGameSec: GAME_DAY_GAME_SEC,
  maxOfflineRealSec: MAX_OFFLINE_REAL_SEC,
  maxOfflineGameSec: MAX_OFFLINE_GAME_SEC,
  tickIntervalRealMs: TICK_INTERVAL_REAL_MS,
} as const;

export type GameConfig = typeof GAME_CONFIG;

function pickConfigNumber(
  value: number | null | undefined,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** DB 缺列或欄位非法時，逐欄回退 {@link GAME_CONFIG}。 */
export function gameConfigFromDb(
  row: Partial<GameConfigValues> | null | undefined,
): GameConfigValues {
  if (!row) return { ...GAME_CONFIG };
  return {
    timeScale: pickConfigNumber(row.timeScale, GAME_CONFIG.timeScale),
    gameDayGameSec: pickConfigNumber(row.gameDayGameSec, GAME_CONFIG.gameDayGameSec),
    maxOfflineRealSec: pickConfigNumber(row.maxOfflineRealSec, GAME_CONFIG.maxOfflineRealSec),
    maxOfflineGameSec: pickConfigNumber(row.maxOfflineGameSec, GAME_CONFIG.maxOfflineGameSec),
    tickIntervalRealMs: pickConfigNumber(row.tickIntervalRealMs, GAME_CONFIG.tickIntervalRealMs),
  };
}
