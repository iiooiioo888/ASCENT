import { MAX_OFFLINE_REAL_SEC, TIME_SCALE } from "./config";
import type { BuildingQueueJob, BuildingStatus, SettleWindowInput, SettleWindowResult } from "./types";

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
