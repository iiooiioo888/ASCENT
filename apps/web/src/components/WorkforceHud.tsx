import type { ReactNode } from "react";
import type { BuildingActionErrorView } from "../building-action-error";
import { canHireWorkforce, hasWorkforceUi, workforceHudLabel } from "../ops-depth";
import { OPS_DEPTH_COPY } from "../ops-depth-copy";
import type { OpsCostsSnapshot, WorkforceSnapshot } from "../types";

type Props = {
  workforce: WorkforceSnapshot;
  opsCosts: OpsCostsSnapshot;
  gold: number;
  pending: boolean;
  error?: BuildingActionErrorView;
  onHire: () => void;
};

export function WorkforceHud({ workforce, opsCosts, gold, pending, error, onHire }: Props) {
  const hireCost = opsCosts.hireCostGold;
  const canHire = canHireWorkforce(workforce, gold, hireCost);
  const atCap = workforce.hired >= workforce.maxHired;

  return (
    <div className="workforce-hud" data-testid="workforce-hud">
      <span className="chip chip-workforce" data-testid="hud-workforce-chip">
        {workforceHudLabel(workforce)}
      </span>
      <button
        type="button"
        className="workforce-hire-btn"
        disabled={pending || !canHire}
        title={atCap ? OPS_DEPTH_COPY.workforceCap : gold < hireCost ? OPS_DEPTH_COPY.needGold : undefined}
        onClick={onHire}
      >
        {OPS_DEPTH_COPY.hire}
        <small className="workforce-hire-preview">{OPS_DEPTH_COPY.hirePreview(hireCost)}</small>
      </button>
      {error ? (
        <p className="workforce-hire-error" role="alert" title={error.hint}>
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

export function maybeWorkforceHud(props: {
  workforce?: WorkforceSnapshot;
  opsCosts?: OpsCostsSnapshot;
  gold: number;
  pending: boolean;
  error?: BuildingActionErrorView;
  onHire: () => void;
}): ReactNode {
  if (!hasWorkforceUi(props.workforce, props.opsCosts)) return null;
  return (
    <WorkforceHud
      workforce={props.workforce!}
      opsCosts={props.opsCosts!}
      gold={props.gold}
      pending={props.pending}
      error={props.error}
      onHire={props.onHire}
    />
  );
}
