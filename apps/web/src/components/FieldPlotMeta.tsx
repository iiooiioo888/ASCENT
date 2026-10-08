import { memo } from "react";
import type { EnvironmentState } from "../types";
import {
  fallowCountdownLine,
  fieldYieldPreviewLine,
  weatherHudChipLabel,
} from "../environment-copy";
import { fallowRemainRealSec, isFieldFallow } from "../environment-ui";
import { useProgressTick } from "../hooks/useProgressTick";
import { FIELD_BUILDING_DEF_ID } from "../resource-loop-copy";

type Props = {
  buildingDefId: string;
  fallowUntil?: number;
  displayGameTime: number;
  timeScale: number;
  serverRealTime: string;
  environment?: EnvironmentState;
};

/** 田卡頂部固定高度：休地倒數或天氣產量提示。 */
export const FieldPlotMeta = memo(function FieldPlotMeta({
  buildingDefId,
  fallowUntil,
  displayGameTime,
  timeScale,
  serverRealTime,
  environment,
}: Props) {
  if (buildingDefId !== FIELD_BUILDING_DEF_ID) return null;

  const nowMs = useProgressTick(true);
  const inFallow = isFieldFallow(buildingDefId, fallowUntil);

  let content: string | null = null;
  if (inFallow && fallowUntil != null) {
    const remain = fallowRemainRealSec(
      fallowUntil,
      displayGameTime,
      timeScale,
      serverRealTime,
      nowMs,
    );
    content = fallowCountdownLine(remain);
  } else if (environment) {
    if (environment.yieldMult !== 1) {
      content = fieldYieldPreviewLine(environment.yieldMult);
    } else {
      content = weatherHudChipLabel(environment.weather, environment.yieldMult, false);
    }
  }

  return (
    <div className="field-plot-meta" data-testid="field-plot-meta" aria-live="polite">
      {content ? <span className="field-plot-meta-line">{content}</span> : <span className="field-plot-meta-placeholder" aria-hidden="true">—</span>}
    </div>
  );
});
