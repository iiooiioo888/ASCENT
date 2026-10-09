import type { ReactNode } from "react";
import { workforceHudSummaryLabel } from "../hud-display";
import type { InvRow, WorkforceSnapshot } from "../types";
import { HudGameClock } from "./HudGameClock";
import { IngotHud } from "./IngotHud";

type Props = {
  inventory: InvRow[];
  copperQty: number;
  time: { displayGameTime: number; timeScale: number; serverRealTime: string };
  workforce?: WorkforceSnapshot;
  showWorkforceSummary: boolean;
};

export function HudPrimaryChips({
  inventory,
  copperQty,
  time,
  workforce,
  showWorkforceSummary,
}: Props) {
  const chips: ReactNode[] = [
    <HudGameClock
      key="clock"
      displayGameTime={time.displayGameTime}
      timeScale={time.timeScale}
      serverRealTime={time.serverRealTime}
    />,
    <IngotHud key="ingots" inventory={inventory} copperQty={copperQty} />,
  ];

  if (showWorkforceSummary && workforce) {
    chips.push(
      <span key="workforce" className="chip chip-workforce" data-testid="hud-workforce-chip">
        {workforceHudSummaryLabel(workforce)}
      </span>,
    );
  }

  return (
    <div className="hud-primary-chips" data-testid="hud-primary-chips">
      {chips}
    </div>
  );
}
