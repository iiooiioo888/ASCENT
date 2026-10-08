import { useState } from "react";
import {
  autoMethodSelectValue,
  isBuildingAutoEnabled,
  parseAutoMethodSelectValue,
  showBuildingAutoMethodSelect,
  showBuildingAutoToggle,
} from "../building-auto";
import { canStopBuilding, showProductionActionButtons } from "../building-actions";
import { fmtIo, statusLabel } from "../format";
import { BuildingJobProgress } from "./BuildingJobProgress";
import { canAffordInputs, fmtInputHaveNeed, inputAvailability, inventoryQtyMap } from "../inventory";
import type { BuildingActionErrorView } from "../building-action-error";
import { BUILDING_ICON, METHOD_NAME } from "../meta";
import { showGoMarketForStart, startOpsPrecheck } from "../ops-depth";
import { GoMarketCta } from "./GoMarketCta";
import { OPS_DEPTH_COPY } from "../ops-depth-copy";
import type { Building, InvRow, Method, OpsCostsSnapshot, WorkforceSnapshot } from "../types";
import {
  AUTO_METHOD_DEFAULT_OPTION_LABEL,
  autoMethodSelectAriaLabel,
  methodPurposeHint,
  methodSelectAriaLabel,
  SILO_CARD_BODY,
} from "../productCopy";
import { StopConfirmDialog } from "./StopConfirmDialog";
import { fieldYieldPreviewLine } from "../environment-copy";
import { isFieldFallow, scaledGrowOutputsPreview } from "../environment-ui";
import { isFieldGrowRuleId } from "@ascent/shared";
import { FieldFallowNotice } from "./FieldFallowNotice";

type Props = {
  building: Building;
  options: Method[];
  inventory: InvRow[];
  selectedId: string | undefined;
  selected: Method | undefined;
  timeScale: number;
  serverRealTime: string;
  actionError?: BuildingActionErrorView;
  actionSuccess?: string;
  pending: boolean;
  onSelectMethod: (methodId: string) => void;
  onStart: () => void;
  onStop: () => void;
  onCollect: () => void;
  autoPending?: boolean;
  autoActionError?: BuildingActionErrorView;
  onAutoToggle?: (autoEnabled: boolean) => void;
  autoMethodPending?: boolean;
  autoMethodActionError?: BuildingActionErrorView;
  onAutoMethodChange?: (autoMethodId: string | null) => void;
  highlight?: boolean;
  scrollAnchorId?: string;
  goldBalance?: number;
  workforce?: WorkforceSnapshot;
  opsCosts?: OpsCostsSnapshot;
  onGoMarket?: () => void;
  displayGameTime?: number;
  environmentYieldMult?: number;
};

export function BuildingCard({
  building: b,
  options,
  inventory,
  selectedId,
  selected,
  timeScale,
  serverRealTime,
  actionError,
  actionSuccess,
  pending,
  onSelectMethod,
  onStart,
  onStop,
  onCollect,
  autoPending = false,
  autoActionError,
  onAutoToggle,
  autoMethodPending = false,
  autoMethodActionError,
  onAutoMethodChange,
  highlight = false,
  scrollAnchorId,
  goldBalance = 0,
  workforce,
  opsCosts,
  onGoMarket,
  displayGameTime = 0,
  environmentYieldMult,
}: Props) {
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

  const job = b.queue[0];

  const methodLocked = b.status === "running" || b.status === "ready";
  const displayMethodId = methodLocked && b.methodId ? b.methodId : selectedId;
  const displayMethod = options.find((m) => m.id === displayMethodId) ?? selected;

  const stock = inventoryQtyMap(inventory);
  const affordSelected =
    selected && b.status === "idle" ? canAffordInputs(stock, selected.inputs) : true;
  const inputRows = selected && b.status === "idle" ? inputAvailability(stock, selected.inputs) : [];
  const anyShort = inputRows.some((r) => r.short);

  const ops =
    b.status === "idle" && selected
      ? startOpsPrecheck(b.buildingDefId, goldBalance, workforce, opsCosts)
      : null;
  const opsOk = ops ? ops.laborOk && ops.goldOk : true;
  const showOpsPreview = b.status === "idle" && !!selected && !!opsCosts;
  const showMarketCta =
    onGoMarket &&
    showGoMarketForStart(ops, affordSelected, b.status === "idle", !!selected);

  const runningMethod = b.methodId ? options.find((m) => m.id === b.methodId) : undefined;
  const stopPaidOps = runningMethod
    ? startOpsPrecheck(b.buildingDefId, goldBalance, workforce, opsCosts)
    : null;
  const purposeHint = methodPurposeHint(displayMethod?.id);
  const inFallow = isFieldFallow(b.buildingDefId, b.fallowUntil);
  const showActions = showProductionActionButtons(b);
  const showAuto = showBuildingAutoToggle(b) && onAutoToggle != null;
  const showAutoMethod =
    showBuildingAutoMethodSelect(b, options.length) && onAutoMethodChange != null;
  const autoOn = isBuildingAutoEnabled(b);
  const autoMethodSelectId = `auto-method-select-${b.id}`;
  const yieldMult =
    environmentYieldMult != null && selected && isFieldGrowRuleId(selected.ruleId)
      ? environmentYieldMult
      : undefined;
  const previewOutputs =
    displayMethod && yieldMult != null
      ? scaledGrowOutputsPreview(displayMethod.ruleId, displayMethod.outputs, yieldMult)
      : displayMethod?.outputs;
  const methodSelectId = `method-select-${b.id}`;
  const buildingIconLabel = b.buildingDef.name;

  const handleStopConfirm = () => {
    setStopConfirmOpen(false);
    onStop();
  };

  return (
    <article
      id={scrollAnchorId}
      className={`plot ${b.status}${pending ? " pending" : ""}${autoPending ? " auto-pending" : ""}${highlight ? " scroll-highlight" : ""}`}
    >
      {showAuto || showAutoMethod ? (
        <div className="plot-auto-bar">
          {showAuto ? (
            <button
              type="button"
              className={`auto-toggle${autoOn ? " on" : ""}`}
              role="switch"
              aria-checked={autoOn}
              aria-label={`${b.buildingDef.name}自動生產`}
              disabled={autoPending}
              onClick={() => onAutoToggle(!autoOn)}
            >
              <span className="auto-toggle-track" aria-hidden="true">
                <span className="auto-toggle-thumb" />
              </span>
              <span className="auto-toggle-label">自動</span>
            </button>
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
                onChange={(e) => onAutoMethodChange(parseAutoMethodSelectValue(e.target.value))}
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

        <BuildingJobProgress
          buildingName={b.buildingDef.name}
          status={b.status}
          job={job}
          timeScale={timeScale}
          serverRealTime={serverRealTime}
          bufferedOutputs={b.bufferedOutputs}
        />

        {inFallow && b.fallowUntil != null ? (
          <FieldFallowNotice
            fallowUntil={b.fallowUntil}
            displayGameTime={displayGameTime}
            timeScale={timeScale}
            serverRealTime={serverRealTime}
          />
        ) : null}

        {options.length ? (
          <>
            <div className="method-field">
              <label className="method-label" htmlFor={methodSelectId}>
                {methodSelectAriaLabel(b.buildingDef.name)}
              </label>
              <select
                id={methodSelectId}
                value={displayMethodId ?? ""}
                disabled={methodLocked}
                onChange={(e) => onSelectMethod(e.target.value)}
              >
              {options.map((m) => (
                <option key={m.id} value={m.id}>
                  {METHOD_NAME[m.id] ?? m.code} · {(m.durationGameSec / timeScale).toFixed(0)} 秒
                </option>
              ))}
              </select>
            </div>
            <div className="recipe">
              {displayMethod ? (
                <>
                  <div className="recipe-io">
                    <span>消耗 </span>
                    {anyShort ? (
                      <span className="recipe-shortages">
                        {inputRows.map((row) => (
                          <span key={row.item_id} className={row.short ? "shortage" : ""}>
                            {fmtInputHaveNeed(row)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span>{fmtIo(displayMethod.inputs)}</span>
                    )}
                  </div>
                  <div>產出 {fmtIo(previewOutputs ?? displayMethod.outputs)}</div>
                  {yieldMult != null && yieldMult !== 1 ? (
                    <p className="env-yield-preview" data-testid="env-yield-preview">
                      {fieldYieldPreviewLine(yieldMult)}
                    </p>
                  ) : null}
                  {purposeHint ? <p className="purpose-hint">{purposeHint}</p> : null}
                  {showOpsPreview && ops ? (
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
                      {showMarketCta ? <GoMarketCta onClick={onGoMarket} /> : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="recipe">{SILO_CARD_BODY}</div>
        )}

        {actionError ? (
          <p className="plot-action-error" role="alert" title={actionError.hint}>
            {actionError.message}
          </p>
        ) : null}
        {actionSuccess && !actionError ? (
          <p className="plot-action-success" aria-live="polite">
            {actionSuccess}
          </p>
        ) : null}

        {showActions ? (
          <div className="actions">
            <button
              type="button"
              disabled={
                !options.length ||
                b.status !== "idle" ||
                !selected ||
                !affordSelected ||
                !opsOk ||
                inFallow
              }
              onClick={onStart}
            >
              開工
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!canStopBuilding(b.status)}
              onClick={() => setStopConfirmOpen(true)}
            >
              停止
            </button>
            <button type="button" className="collect" disabled={b.status !== "ready"} onClick={onCollect}>
              收取
            </button>
          </div>
        ) : null}
      </fieldset>

      <StopConfirmDialog
        open={stopConfirmOpen}
        buildingName={b.buildingDef.name}
        method={runningMethod}
        paidOpsCosts={
          stopPaidOps ? { wage: stopPaidOps.wage, haul: stopPaidOps.haul } : { wage: 0, haul: 0 }
        }
        onCancel={() => setStopConfirmOpen(false)}
        onConfirm={handleStopConfirm}
      />
    </article>
  );
}
