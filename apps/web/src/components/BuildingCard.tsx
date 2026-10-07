import { useState } from "react";
import { canStopBuilding, showProductionActionButtons } from "../building-actions";
import { fmtBuffered, fmtIo, statusLabel } from "../format";
import { useProgressTick } from "../hooks/useProgressTick";
import { jobProgressPercent, jobRemainRealSec } from "../productionProgress";
import { canAffordInputs, fmtInputHaveNeed, inputAvailability, inventoryQtyMap } from "../inventory";
import type { BuildingActionErrorView } from "../building-action-error";
import { BUILDING_ICON, METHOD_NAME } from "../meta";
import { startOpsPrecheck } from "../ops-depth";
import { OPS_DEPTH_COPY } from "../ops-depth-copy";
import type { Building, InvRow, Method, OpsCostsSnapshot, WorkforceSnapshot } from "../types";
import {
  methodPurposeHint,
  methodSelectAriaLabel,
  productionProgressAriaLabel,
  SILO_CARD_BODY,
} from "../productCopy";
import { StopConfirmDialog } from "./StopConfirmDialog";

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
  highlight?: boolean;
  scrollAnchorId?: string;
  goldBalance?: number;
  workforce?: WorkforceSnapshot;
  opsCosts?: OpsCostsSnapshot;
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
  highlight = false,
  scrollAnchorId,
  goldBalance = 0,
  workforce,
  opsCosts,
}: Props) {
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

  const job = b.queue[0];
  const smoothProgress = b.status === "running" && !!job;
  const nowMs = useProgressTick(smoothProgress);
  const progress = job
    ? jobProgressPercent(job, timeScale, serverRealTime, nowMs)
    : 0;
  const remain = job ? jobRemainRealSec(job, timeScale, serverRealTime, nowMs) : 0;

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

  const runningMethod = b.methodId ? options.find((m) => m.id === b.methodId) : undefined;
  const stopPaidOps = runningMethod
    ? startOpsPrecheck(b.buildingDefId, goldBalance, workforce, opsCosts)
    : null;
  const purposeHint = methodPurposeHint(displayMethod?.id);
  const progressPercent = Math.round(b.status === "ready" ? 100 : progress);
  const showActions = showProductionActionButtons(b);
  const methodSelectId = `method-select-${b.id}`;
  const buildingIconLabel = b.buildingDef.name;

  const handleStopConfirm = () => {
    setStopConfirmOpen(false);
    onStop();
  };

  return (
    <article
      id={scrollAnchorId}
      className={`plot ${b.status}${pending ? " pending" : ""}${highlight ? " scroll-highlight" : ""}`}
    >
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

        {job ? (
          <p className="jobline">
            進行中 {progress.toFixed(0)}% · 剩 {remain.toFixed(0)} 現實秒
          </p>
        ) : (
          <p className="jobline">{b.status === "ready" ? `可收取 ${fmtBuffered(b.bufferedOutputs)}` : "等待開工"}</p>
        )}

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
                  <div>產出 {fmtIo(displayMethod.outputs)}</div>
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
                !options.length || b.status !== "idle" || !selected || !affordSelected || !opsOk
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
        {job || b.status === "ready" ? (
          <div
            className="bar"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={productionProgressAriaLabel(b.buildingDef.name, progressPercent)}
          >
            <i style={{ width: `${progressPercent}%` }} aria-hidden />
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
