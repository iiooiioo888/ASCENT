import { fmtHudGameClockCompact } from "../hud-display";
import { useInterpolatedGameTime } from "../hooks/useInterpolatedGameTime";

type Props = {
  displayGameTime: number;
  timeScale: number;
  serverRealTime: string;
};

export function HudGameClock({ displayGameTime, timeScale, serverRealTime }: Props) {
  const gameSec = useInterpolatedGameTime(displayGameTime, timeScale, serverRealTime);

  return (
    <span className="chip chip-muted chip-hud-clock" data-testid="hud-game-clock">
      {fmtHudGameClockCompact(gameSec)}
    </span>
  );
}
