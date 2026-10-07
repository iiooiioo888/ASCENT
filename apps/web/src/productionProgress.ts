export type ProductionJob = {
  elapsedGameSec: number;
  durationGameSec: number;
};

/**
 * Client-side display interpolation between poll ticks (P3-2).
 * Does not write back to the server.
 */
export function smoothElapsedGameSec(
  job: ProductionJob,
  timeScale: number,
  serverRealTime: string,
  nowMs = Date.now(),
): number {
  const serverMs = Date.parse(serverRealTime);
  if (!Number.isFinite(serverMs)) return job.elapsedGameSec;

  const deltaRealSec = Math.max(0, (nowMs - serverMs) / 1000);
  const deltaGameSec = deltaRealSec * timeScale;
  return Math.min(job.durationGameSec, job.elapsedGameSec + deltaGameSec);
}

export function jobProgressPercent(
  job: ProductionJob,
  timeScale: number,
  serverRealTime: string,
  nowMs = Date.now(),
): number {
  if (job.durationGameSec <= 0) return 0;
  const elapsed = smoothElapsedGameSec(job, timeScale, serverRealTime, nowMs);
  return Math.min(100, (elapsed / job.durationGameSec) * 100);
}

export function jobRemainRealSec(
  job: ProductionJob,
  timeScale: number,
  serverRealTime: string,
  nowMs = Date.now(),
): number {
  if (timeScale <= 0) return 0;
  const elapsed = smoothElapsedGameSec(job, timeScale, serverRealTime, nowMs);
  return Math.max(0, (job.durationGameSec - elapsed) / timeScale);
}
