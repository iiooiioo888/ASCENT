import type { WeatherId } from "@ascent/shared";

export const FALLOW_ACTIVE_COPY = "土地休耕中";

const WEATHER_LABEL: Record<WeatherId, string> = {
  fair: "晴",
  rain: "雨",
  drought: "旱",
};

const WEATHER_ICON: Record<WeatherId, string> = {
  fair: "☀️",
  rain: "🌧️",
  drought: "🏜️",
};

/** HUD 天氣 chip 文案（可選附產量倍率）。 */
export function weatherHudChipLabel(weather: WeatherId, yieldMult: number, showMult = true): string {
  const base = `${WEATHER_ICON[weather]} ${WEATHER_LABEL[weather]}`;
  if (!showMult || yieldMult === 1) return base;
  const pct = Math.round(yieldMult * 100);
  return `${base} · 產量×${pct}%`;
}

export function fallowCountdownLine(remainRealSec: number): string {
  const sec = Math.max(0, Math.ceil(remainRealSec));
  return `${FALLOW_ACTIVE_COPY} · 剩 ${sec} 秒`;
}

export function fieldYieldPreviewLine(yieldMult: number): string {
  if (yieldMult === 1) return "天氣產量倍率 ×1";
  const pct = Math.round(yieldMult * 100);
  return `天氣產量倍率 ×${pct}%（預估入帳）`;
}
