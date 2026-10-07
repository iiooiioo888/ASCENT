import { memo } from "react";
import { fmtBuffered } from "../format";
import { useProgressTick } from "../hooks/useProgressTick";
import { jobProgressPercent, jobRemainRealSec } from "../productionProgress";
import { productionProgressAriaLabel } from "../productCopy";
import type { Building } from "../types";

type Props = {
  buildingName: string;
  status: string;
  job: Building["queue"][number] | undefined;
  timeScale: number;
  serverRealTime: string;
  bufferedOutputs: Record<string, number>;
};

/** 200ms tick isolated here so idle BuildingCard shells do not re-render (J-UX-2). */
export const BuildingJobProgress = memo(function BuildingJobProgress({
  buildingName,
  status,
  job,
  timeScale,
  serverRealTime,
  bufferedOutputs,
}: Props) {
  const smoothProgress = status === "running" && !!job;
  const nowMs = useProgressTick(smoothProgress);
  const progress = job ? jobProgressPercent(job, timeScale, serverRealTime, nowMs) : 0;
  const remain = job ? jobRemainRealSec(job, timeScale, serverRealTime, nowMs) : 0;
  const progressPercent = Math.round(status === "ready" ? 100 : progress);

  return (
    <>
      {job ? (
        <p className="jobline">
          進行中{" "}
          <span className="jobline-num jobline-pct" aria-hidden>
            {progress.toFixed(0)}
          </span>
          % · 剩{" "}
          <span className="jobline-num jobline-remain" aria-hidden>
            {remain.toFixed(0)}
          </span>{" "}
          現實秒
        </p>
      ) : (
        <p className="jobline">
          {status === "ready" ? `可收取 ${fmtBuffered(bufferedOutputs)}` : "等待開工"}
        </p>
      )}
      {job || status === "ready" ? (
        <div
          className="bar"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={productionProgressAriaLabel(buildingName, progressPercent)}
        >
          <i style={{ width: `${progressPercent}%` }} aria-hidden />
        </div>
      ) : null}
    </>
  );
});
