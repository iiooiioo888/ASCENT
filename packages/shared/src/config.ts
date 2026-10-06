export const TIME_SCALE = 60;
export const GAME_DAY_GAME_SEC = 86400;
export const MAX_OFFLINE_REAL_SEC = 28800;
export const MAX_OFFLINE_GAME_SEC = MAX_OFFLINE_REAL_SEC * TIME_SCALE;
export const TICK_INTERVAL_REAL_MS = 5000;
export const LOCAL_PLAYER_ID = "player_local";
export const QUEUE_LIMIT_MVP = 1;
export const RELEASED_IN_VERSION = "mvp";

export const GAME_CONFIG = {
  timeScale: TIME_SCALE,
  gameDayGameSec: GAME_DAY_GAME_SEC,
  maxOfflineRealSec: MAX_OFFLINE_REAL_SEC,
  maxOfflineGameSec: MAX_OFFLINE_GAME_SEC,
  tickIntervalRealMs: TICK_INTERVAL_REAL_MS,
} as const;

export type GameConfig = typeof GAME_CONFIG;
