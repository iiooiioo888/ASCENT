/** ENV-D6／D7：全域天氣與田種植產量倍率（可經 game_config.environment 覆写）。 */
export type WeatherId = "fair" | "rain" | "drought";

export type EnvironmentConfig = {
  /** 休地時長（遊戲秒）；ENV-D3 預設 30 遊戲分 = 1800。 */
  fallowDurationGameSec: number;
  /** 天氣持續（遊戲秒）後懶切換。 */
  weatherDurationGameSec: number;
  yieldMult: Record<WeatherId, number>;
  weatherRotation: WeatherId[];
};

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  fallowDurationGameSec: 1800,
  weatherDurationGameSec: 3600,
  yieldMult: {
    fair: 1,
    rain: 1.15,
    drought: 0.75,
  },
  weatherRotation: ["fair", "rain", "drought"],
};

export type EnvironmentSnapshot = {
  weather: WeatherId;
  yieldMult: number;
  nextChangeAt?: number;
};

export type PersistedWeatherState = {
  weather: WeatherId;
  nextChangeAtGame: number;
};

const WEATHER_SET = new Set<WeatherId>(["fair", "rain", "drought"]);

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

function isWeatherId(v: unknown): v is WeatherId {
  return typeof v === "string" && WEATHER_SET.has(v as WeatherId);
}

function pickYieldMult(
  base: Record<WeatherId, number>,
  patch: Record<string, unknown> | undefined,
): Record<WeatherId, number> {
  const out = { ...base };
  if (!patch || typeof patch !== "object") return out;
  for (const id of WEATHER_SET) {
    const v = patch[id];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) out[id] = v;
  }
  return out;
}

function pickRotation(patch: unknown, fallback: WeatherId[]): WeatherId[] {
  if (!Array.isArray(patch) || patch.length === 0) return [...fallback];
  const filtered = patch.filter(isWeatherId);
  return filtered.length > 0 ? filtered : [...fallback];
}

/** DB `game_config.environment` JSON 合併預設。 */
export function environmentConfigFromDb(raw: unknown): EnvironmentConfig {
  const base = DEFAULT_ENVIRONMENT_CONFIG;
  if (!raw || typeof raw !== "object") return { ...base };
  const obj = raw as Record<string, unknown>;
  return {
    fallowDurationGameSec: isPositiveInt(obj.fallowDurationGameSec)
      ? obj.fallowDurationGameSec
      : base.fallowDurationGameSec,
    weatherDurationGameSec: isPositiveInt(obj.weatherDurationGameSec)
      ? obj.weatherDurationGameSec
      : base.weatherDurationGameSec,
    yieldMult: pickYieldMult(base.yieldMult, obj.yieldMult as Record<string, unknown>),
    weatherRotation: pickRotation(obj.weatherRotation, base.weatherRotation),
  };
}

/** 只影響田 `grow_*` 種植（ENV-D1）；`rule_save_seed` 等唔算。 */
export function isFieldGrowRuleId(ruleId: string): boolean {
  return ruleId.startsWith("rule_grow_");
}

export function weatherYieldMult(config: EnvironmentConfig, weather: WeatherId): number {
  return config.yieldMult[weather] ?? 1;
}

export function environmentSnapshot(
  config: EnvironmentConfig,
  weather: WeatherId,
  nextChangeAtGame: number | null | undefined,
  currentGameSec: number,
): EnvironmentSnapshot {
  const next =
    typeof nextChangeAtGame === "number" && nextChangeAtGame > currentGameSec
      ? nextChangeAtGame
      : undefined;
  return {
    weather,
    yieldMult: weatherYieldMult(config, weather),
    nextChangeAt: next,
  };
}

export function isFallowActive(
  fallowUntilGame: number | null | undefined,
  currentGameSec: number,
): boolean {
  return typeof fallowUntilGame === "number" && fallowUntilGame > currentGameSec;
}

/** 田種植結算產出 × 天氣倍率（主／副產整包）。 */
export function scaleOutputsByYield(
  outputs: Record<string, number>,
  yieldMult: number,
): Record<string, number> {
  if (yieldMult === 1 || Object.keys(outputs).length === 0) return { ...outputs };
  const scaled: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(outputs)) {
    scaled[itemId] = Math.max(0, Math.round(qty * yieldMult));
  }
  return scaled;
}

export function initialWeatherState(config: EnvironmentConfig, currentGameSec: number): PersistedWeatherState {
  const weather = config.weatherRotation[0] ?? "fair";
  return {
    weather,
    nextChangeAtGame: currentGameSec + config.weatherDurationGameSec,
  };
}

/** 懶推進：若已過 nextChangeAtGame，沿 rotation 前進並寫下一個切換點。 */
export function advanceWeatherState(
  config: EnvironmentConfig,
  state: PersistedWeatherState,
  currentGameSec: number,
): PersistedWeatherState {
  if (currentGameSec < state.nextChangeAtGame) return state;
  const rotation = config.weatherRotation;
  if (rotation.length === 0) {
    return {
      weather: state.weather,
      nextChangeAtGame: currentGameSec + config.weatherDurationGameSec,
    };
  }
  let weather = state.weather;
  let nextAt = state.nextChangeAtGame;
  let guard = 0;
  while (currentGameSec >= nextAt && guard < 64) {
    const idx = rotation.indexOf(weather);
    const nextIdx = idx >= 0 ? (idx + 1) % rotation.length : 0;
    weather = rotation[nextIdx] ?? "fair";
    nextAt += config.weatherDurationGameSec;
    guard += 1;
  }
  return { weather, nextChangeAtGame: nextAt };
}

export function persistedWeatherFromRow(
  weather: string | null | undefined,
  nextChangeAtGame: bigint | number | null | undefined,
): PersistedWeatherState | null {
  if (!isWeatherId(weather)) return null;
  const next =
    nextChangeAtGame == null
      ? null
      : typeof nextChangeAtGame === "bigint"
        ? Number(nextChangeAtGame)
        : nextChangeAtGame;
  if (next == null || !Number.isFinite(next)) return null;
  return { weather, nextChangeAtGame: next };
}
