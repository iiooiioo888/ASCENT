import { statusLabel } from "../format";
import { BUILDING_ICON } from "../meta";
import { SILO_CARD_BODY } from "../productCopy";
import type { Building } from "../types";

type Props = {
  building: Building;
  actionError?: string;
  pending: boolean;
};

/** U12 simplified warehouse card — no production actions. */
export function SiloBuildingCard({ building: b, actionError, pending }: Props) {
  const buildingIconLabel = b.buildingDef.name;

  return (
    <article className={`plot silo ${b.status}${pending ? " pending" : ""}`}>
      <fieldset className="plot-body" disabled={pending}>
        <div className="plot-head">
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
            <div className="bicon" role="img" aria-label={buildingIconLabel}>
              {BUILDING_ICON[b.buildingDefId] ?? "🏠"}
            </div>
            <div>
              <h3 className="bname">{b.buildingDef.name}</h3>
              <span className={`badge ${b.status}`}>{statusLabel(b.status)}</span>
            </div>
          </div>
        </div>
        <p className="jobline silo-copy">{SILO_CARD_BODY}</p>
        {actionError ? (
          <p className="plot-action-error" role="alert">
            {actionError}
          </p>
        ) : null}
      </fieldset>
    </article>
  );
}
