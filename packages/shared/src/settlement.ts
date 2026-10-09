import { MAX_OFFLINE_GAME_SEC, MAX_OFFLINE_REAL_SEC, TIME_SCALE } from "./config";
import type { BuildingQueueJob, BuildingStatus, SettleWindowInput, SettleWindowResult } from "./types";

/** 建築耐久上限。 */
export const DURABILITY_MAX = 100;
/** 離線上限窗（8 現實小時）內滿載運轉磨損點數；確定性、可重播。 */
export const DURABILITY_WEAR_PER_MAX_OFFLINE = 10;
/** 低於此值時前端提示修復（不改生產公式）。 */
export const DURABILITY_REPAIR_HINT_BELOW = 80;
/** 修復至滿耐久的銅錠成本。 */
export const DURABILITY_REPAIR_COST_COPPER = 20;

export type DurabilitySettleInput = {
  durability: number;
  status: BuildingStatus;
  gameDeltaSec: number;
  maxOfflineGameSec?: number;
};

export type DurabilitySettleOutput = {
  durability: number;
  worn: number;
};

/**
 * 離線／在線區間的確定性磨損。只在 `running` 時磨；禁止隨機源。
 * 滿載跑完一個離線上限窗耗 {@link DURABILITY_WEAR_PER_MAX_OFFLINE} 點。
 */
export function settleDurability(input: DurabilitySettleInput): DurabilitySettleOutput {
  const current = clampDurability(input.durability);
  if (input.status !== "running" || input.gameDeltaSec <= 0) {
    return { durability: current, worn: 0 };
  }
  const windowGame = input.maxOfflineGameSec ?? MAX_OFFLINE_GAME_SEC;
  const wear = (input.gameDeltaSec / windowGame) * DURABILITY_WEAR_PER_MAX_OFFLINE;
  const next = clampDurability(current - wear);
  return { durability: next, worn: current - next };
}

export function clampDurability(value: number): number {
  if (!Number.isFinite(value)) return DURABILITY_MAX;
  return Math.min(DURABILITY_MAX, Math.max(0, value));
}

export function settleWindow(input: SettleWindowInput): SettleWindowResult {
  const rawRealDeltaSec = Math.max(0, (input.nowRealMs - input.lastSettledAtMs) / 1000);
  const cappedRealDeltaSec = Math.min(rawRealDeltaSec, input.maxOfflineRealSec);
  const gameDeltaSec = cappedRealDeltaSec * input.timeScale;
  return {
    rawRealDeltaSec,
    cappedRealDeltaSec,
    gameDeltaSec,
    nextLastSettledAtMs: input.nowRealMs,
  };
}

export function settleWindowDefault(
  lastSettledAtMs: number,
  nowRealMs: number,
): SettleWindowResult {
  return settleWindow({
    lastSettledAtMs,
    nowRealMs,
    timeScale: TIME_SCALE,
    maxOfflineRealSec: MAX_OFFLINE_REAL_SEC,
  });
}

export type ProductionSettleInput = {
  status: BuildingStatus;
  queue: BuildingQueueJob[];
  gameDeltaSec: number;
};

export type ProductionSettleOutput = {
  status: BuildingStatus;
  queue: BuildingQueueJob[];
  completedOutputs: Record<string, number>;
};

export function settleProduction(input: ProductionSettleInput): ProductionSettleOutput {
  if (input.status !== "running" || input.queue.length === 0) {
    return {
      status: input.status,
      queue: input.queue,
      completedOutputs: {},
    };
  }

  const job = { ...input.queue[0], elapsedGameSec: input.queue[0].elapsedGameSec + input.gameDeltaSec };
  if (job.elapsedGameSec >= job.durationGameSec) {
    return {
      status: "ready",
      queue: [{ ...job, elapsedGameSec: job.durationGameSec }],
      completedOutputs: { ...job.outputs },
    };
  }

  return {
    status: "running",
    queue: [job],
    completedOutputs: {},
  };
}

export function mergeQty(
  base: Record<string, number>,
  add: Record<string, number>,
): Record<string, number> {
  const next = { ...base };
  for (const [id, qty] of Object.entries(add)) {
    next[id] = (next[id] ?? 0) + qty;
  }
  return next;
}

export function iosToRecord(ios: { item_id: string; qty: number }[]): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const io of ios) {
    rec[io.item_id] = (rec[io.item_id] ?? 0) + io.qty;
  }
  return rec;
}
