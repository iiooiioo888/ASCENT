import { memo } from "react";
import { fallowCountdownLine } from "../environment-copy";
import { fallowRemainRealSec } from "../environment-ui";
import { useProgressTick } from "../hooks/useProgressTick";

type Props = {
  fallowUntil: number;
  displayGameTime: number;
  timeScale: number;
  serverRealTime: string;
};

export const FieldFallowNotice = memo(function FieldFallowNotice({
  fallowUntil,
  displayGameTime,
  timeScale,
  serverRealTime,
}: Props) {
  const nowMs = useProgressTick(true);
  const remain = fallowRemainRealSec(fallowUntil, displayGameTime, timeScale, serverRealTime, nowMs);
  return (
    <p className="fallow-notice" data-testid="field-fallow-notice" role="status">
      {fallowCountdownLine(remain)}
    </p>
  );
});
