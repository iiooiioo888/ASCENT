import {
  autoMethodSelectValue,
  isBuildingAutoEnabled,
  parseAutoMethodSelectValue,
  showBuildingAutoMethodSelect,
  showBuildingAutoToggle,
} from "../building-auto";
import type { BuildingActionErrorView } from "../building-action-error";
import { OPS_DEPTH_COPY } from "../ops-depth-copy";
import { GoMarketCta } from "./GoMarketCta";
import { METHOD_NAME } from "../meta";
import type { Building, Method, OpsCostsSnapshot, WorkforceSnapshot } from "../types";
import {
  AUTO_METHOD_DEFAULT_OPTION_LABEL,
  autoMethodSelectAriaLabel,
  BUILDING_CARD_DETAILS_SUMMARY,
  buildingCardAutoStateLine,
  buildingCardWorkforceLine,
} from "../productCopy";

type OpsPreview = {
  wage: number;
  haul: number;
  labor: number;
  goldOk: boolean;
  laborOk: boolean;
};

type Props = {
  building: Building;
  options: Method[];
  workforce?: WorkforceSnapshot;
  opsCosts?: OpsCostsSnapshot;
  opsIdle: OpsPreview | null;
  opsActive: OpsPreview | null;
  showMarketCta: boolean;
  onGoMarket?: () => void;
  autoPending?: boolean;
  autoActionError?: BuildingActionErrorView;
  onAutoToggle?: (autoEnabled: boolean) => void;
  autoMethodPending?: boolean;
  autoMethodActionError?: BuildingActionErrorView;
  onAutoMethodChange?: (autoMethodId: string | null) => void;
  purposeHint?: string;
};

export function BuildingCardSecondaryDetails({
  building: b,
  options,
  workforce,
  opsCosts,
  opsIdle,
  opsActive,
  showMarketCta,
  onGoMarket,
  autoPending = false,
  autoActionError,
  onAutoToggle,
  autoMethodPending = false,
  autoMethodActionError,
  onAutoMethodChange,
  purposeHint,
}: Props) {
  const showAuto = showBuildingAutoToggle(b) && onAutoToggle != null;
  const showAutoMethod =
    showBuildingAutoMethodSelect(b, options.length) && onAutoMethodChange != null;
  const autoOn = isBuildingAutoEnabled(b);
  const autoMethodSelectId = `auto-method-select-${b.id}`;

  const showWorkforce = workforce != null && opsCosts != null;
  const showOpsIdle = b.status === "idle" && !!opsIdle && !!opsCosts;
  const showOpsActive =
    (b.status === "running" || b.status === "ready") && !!opsActive && !!opsCosts;
  const ops = showOpsIdle ? opsIdle : showOpsActive ? opsActive : null;
  const showOpsBlock = !!ops && (ops.wage > 0 || ops.haul > 0 || ops.labor > 0);

  const hasContent =
    showWorkforce ||
    showAuto ||
    showAutoMethod ||
    !!b.autoPauseReason ||
    !!autoMethodActionError ||
    !!autoActionError ||
    showOpsBlock ||
    !!purposeHint;

  if (!hasContent) return null;

  return (
    <details className="building-card-details" data-testid="building-card-details">
      <summary className="building-card-details-summary">{BUILDING_CARD_DETAILS_SUMMARY}</summary>
      <div className="building-card-details-body">
        {showWorkforce ? (
          <p className="building-card-meta-line" data-testid="building-workforce-line">
            {buildingCardWorkforceLine(workforce!)}
          </p>
        ) : null}
        {showAuto || showAutoMethod ? (
          <div className="plot-auto-bar building-card-auto-bar">
            {showAuto ? (
              <>
                <p className="building-card-meta-line building-card-auto-state" data-testid="building-auto-state">
                  {buildingCardAutoStateLine(autoOn)}
                </p>
                <button
                  type="button"
                  className={`auto-toggle${autoOn ? " on" : ""}`}
                  role="switch"
                  aria-checked={autoOn}
                  aria-label={`${b.buildingDef.name}自動生產`}
                  disabled={autoPending}
                  onClick={() => onAutoToggle!(!autoOn)}
                >
                  <span className="auto-toggle-track" aria-hidden="true">
                    <span className="auto-toggle-thumb" />
                  </span>
                  <span className="auto-toggle-label">自動</span>
                </button>
              </>
            ) : null}
            {showAutoMethod ? (
              <div className="auto-method-field">
                <label className="auto-method-label" htmlFor={autoMethodSelectId}>
                  掛機配方
                </label>
                <select
                  id={autoMethodSelectId}
                  className="auto-method-select"
                  aria-label={autoMethodSelectAriaLabel(b.buildingDef.name)}
                  value={autoMethodSelectValue(b.autoMethodId)}
                  disabled={autoMethodPending || autoPending}
                  onChange={(e) => onAutoMethodChange!(parseAutoMethodSelectValue(e.target.value))}
                >
                  <option value="">{AUTO_METHOD_DEFAULT_OPTION_LABEL}</option>
                  {options.map((m) => (
                    <option key={m.id} value={m.id}>
                      {METHOD_NAME[m.id] ?? m.code}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {b.autoPauseReason ? (
              <p className="auto-pause-reason" data-testid="auto-pause-reason">
                {b.autoPauseReason}
              </p>
            ) : null}
            {autoMethodActionError ? (
              <p className="plot-action-error plot-auto-error" role="alert" title={autoMethodActionError.hint}>
                {autoMethodActionError.message}
              </p>
            ) : null}
            {autoActionError ? (
              <p className="plot-action-error plot-auto-error" role="alert" title={autoActionError.hint}>
                {autoActionError.message}
              </p>
            ) : null}
          </div>
        ) : null}
        {showOpsBlock && ops ? (
          <div className="ops-cost-preview" data-testid="ops-cost-preview">
            {ops.wage > 0 ? (
              <span className={ops.goldOk ? "" : "shortage"}>
                {OPS_DEPTH_COPY.wage} 🪙{ops.wage}
              </span>
            ) : null}
            {ops.haul > 0 ? (
              <span className={ops.goldOk ? "" : "shortage"}>
                {OPS_DEPTH_COPY.haul} 🪙{ops.haul}
              </span>
            ) : null}
            {ops.labor > 0 ? (
              <span className={ops.laborOk ? "" : "shortage"}>
                {OPS_DEPTH_COPY.labor} {ops.labor}
              </span>
            ) : null}
            {showMarketCta && onGoMarket ? <GoMarketCta onClick={onGoMarket} /> : null}
          </div>
        ) : null}
        {purposeHint ? <p className="purpose-hint">{purposeHint}</p> : null}
      </div>
    </details>
  );
}
