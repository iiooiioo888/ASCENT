import { useState } from "react";
import { canStopBuilding } from "../building-actions";
import { fmtBuffered, fmtIo, realRemainSec, statusLabel } from "../format";
import { canAffordInputs, fmtInputHaveNeed, inputAvailability, inventoryQtyMap } from "../inventory";
import type { BuildingActionErrorView } from "../building-action-error";
import { BUILDING_ICON, METHOD_NAME } from "../meta";
import type { Building, InvRow, Method } from "../types";
import { methodPurposeHint } from "../productCopy";
import { StopConfirmDialog } from "./StopConfirmDialog";

type Props = {
  building: Building;
  options: Method[];
  inventory: InvRow[];
  selectedId: string | undefined;
  selected: Method | undefined;
  timeScale: number;
  actionError?: BuildingActionErrorView;
  pending: boolean;
  onSelectMethod: (methodId: string) => void;
  onStart: () => void;
  onStop: () => void;
  onCollect: () => void;
  highlight?: boolean;
  scrollAnchorId?: string;
};

export function BuildingCard({
  building: b,
  options,
  inventory,
  selectedId,
  selected,
  timeScale,
  actionError,
  pending,
  onSelectMethod,
  onStart,
  onStop,
  onCollect,
  highlight = false,
  scrollAnchorId,
}: Props) {
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

  const job = b.queue[0];
  const progress = job ? Math.min(100, (job.elapsedGameSec / job.durationGameSec) * 100) : 0;
  const remain = realRemainSec(job, timeScale);

  const methodLocked = b.status === "running" || b.status === "ready";
  const displayMethodId = methodLocked && b.methodId ? b.methodId : selectedId;
  const displayMethod = options.find((m) => m.id === displayMethodId) ?? selected;

  const stock = inventoryQtyMap(inventory);
  const affordSelected =
    selected && b.status === "idle" ? canAffordInputs(stock, selected.inputs) : true;
  const inputRows = selected && b.status === "idle" ? inputAvailability(stock, selected.inputs) : [];
  const anyShort = inputRows.some((r) => r.short);

  const runningMethod = b.methodId ? options.find((m) => m.id === b.methodId) : undefined;
  const purposeHint = methodPurposeHint(displayMethod?.id);

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
            <div className="bicon">{BUILDING_ICON[b.buildingDefId] ?? "🏠"}</div>
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
            <select
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
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="recipe">倉不開工，只佔建築槽。</div>
        )}

        {actionError ? (
          <p className="plot-action-error" role="alert" title={actionError.hint}>
            {actionError.message}
          </p>
        ) : null}

        <div className="actions">
          <button
            type="button"
            disabled={!options.length || b.status !== "idle" || !selected || !affordSelected}
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
        {job || b.status === "ready" ? (
          <div className="bar">
            <i style={{ width: `${b.status === "ready" ? 100 : progress}%` }} />
          </div>
        ) : null}
      </fieldset>

      <StopConfirmDialog
        open={stopConfirmOpen}
        buildingName={b.buildingDef.name}
        method={runningMethod}
        onCancel={() => setStopConfirmOpen(false)}
        onConfirm={handleStopConfirm}
      />
    </article>
  );
}
