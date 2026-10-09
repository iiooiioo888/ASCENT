import { useState } from "react";
import { canStopBuilding, showProductionActionButtons } from "../building-actions";
import { fmtIo, statusLabel } from "../format";
import { BuildingJobProgress } from "./BuildingJobProgress";
import { canAffordInputs, fmtInputHaveNeed, inputAvailability, inventoryQtyMap } from "../inventory";
import type { BuildingActionErrorView } from "../building-action-error";
import { BUILDING_ICON, METHOD_NAME } from "../meta";
import { showGoMarketForStart, startOpsPrecheck } from "../ops-depth";
import type { Building, InvRow, Method, OpsCostsSnapshot, WorkforceSnapshot } from "../types";
import { methodPurposeHint, methodSelectAriaLabel, SILO_CARD_BODY } from "../productCopy";
import { StopConfirmDialog } from "./StopConfirmDialog";
import { fieldYieldPreviewLine } from "../environment-copy";
import { isFieldFallow, scaledGrowOutputsPreview } from "../environment-ui";
import { isFieldGrowRuleId } from "@ascent/shared";
import { BuildingCardRecipeRow } from "./BuildingCardRecipeRow";
import { BuildingCardSecondaryDetails } from "./BuildingCardSecondaryDetails";
import { FieldPlotMeta } from "./FieldPlotMeta";
import { isFieldBuilding } from "../field-plot";
import type { EnvironmentState } from "../types";

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
  environment?: EnvironmentState;
  plotTitle?: string;
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
  environment,
  plotTitle,
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
  const yieldMult =
    environmentYieldMult != null && selected && isFieldGrowRuleId(selected.ruleId)
      ? environmentYieldMult
      : undefined;
  const previewOutputs =
    displayMethod && yieldMult != null
      ? scaledGrowOutputsPreview(displayMethod.ruleId, displayMethod.outputs, yieldMult)
      : displayMethod?.outputs;
  const methodSelectId = `method-select-${b.id}`;
  const buildingIconLabel = plotTitle ?? b.buildingDef.name;
  const fieldPlot = isFieldBuilding(b);

  const handleStopConfirm = () => {
    setStopConfirmOpen(false);
    onStop();
  };

  return (
    <article
      id={scrollAnchorId}
      className={`plot ${b.status}${fieldPlot ? " field-plot" : ""}${pending ? " pending" : ""}${autoPending ? " auto-pending" : ""}${highlight ? " scroll-highlight" : ""}`}
    >
      <fieldset className="plot-body" disabled={pending}>
        <div className="plot-head">
          <div className="plot-head-main">
            <div className="bicon" role="img" aria-label={buildingIconLabel}>
              {BUILDING_ICON[b.buildingDefId] ?? "🏠"}
            </div>
            <div>
              <h3 className="bname">{buildingIconLabel}</h3>
              <span className={`badge ${b.status}`}>{statusLabel(b.status)}</span>
            </div>
          </div>
          {fieldPlot ? (
            <FieldPlotMeta
              buildingDefId={b.buildingDefId}
              fallowUntil={b.fallowUntil}
              displayGameTime={displayGameTime}
              timeScale={timeScale}
              serverRealTime={serverRealTime}
              environment={environment}
            />
          ) : null}
        </div>

        <BuildingJobProgress
          buildingName={buildingIconLabel}
          status={b.status}
          job={job}
          timeScale={timeScale}
          serverRealTime={serverRealTime}
          bufferedOutputs={b.bufferedOutputs}
        />

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
                  <BuildingCardRecipeRow
                    inputs={
                      anyShort && b.status === "idle" ? (
                        <span className="recipe-shortages">
                          {inputRows.map((row) => (
                            <span key={row.item_id} className={row.short ? "shortage" : ""}>
                              {fmtInputHaveNeed(row)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        fmtIo(displayMethod.inputs)
                      )
                    }
                    outputs={fmtIo(previewOutputs ?? displayMethod.outputs)}
                  />
                  {yieldMult != null && yieldMult !== 1 ? (
                    <p className="env-yield-preview" data-testid="env-yield-preview">
                      {fieldYieldPreviewLine(yieldMult)}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
            <BuildingCardSecondaryDetails
              building={b}
              options={options}
              workforce={workforce}
              opsCosts={opsCosts}
              opsIdle={ops}
              opsActive={stopPaidOps}
              showMarketCta={!!showMarketCta}
              onGoMarket={onGoMarket}
              autoPending={autoPending}
              autoActionError={autoActionError}
              onAutoToggle={onAutoToggle}
              autoMethodPending={autoMethodPending}
              autoMethodActionError={autoMethodActionError}
              onAutoMethodChange={onAutoMethodChange}
              purposeHint={purposeHint}
            />
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
