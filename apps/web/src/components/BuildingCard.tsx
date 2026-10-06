import { canStopBuilding } from "../building-actions";
import { fmtBuffered, fmtIo, realRemainSec, statusLabel } from "../format";
import { BUILDING_ICON, METHOD_NAME } from "../meta";
import type { Building, Method } from "../types";

type Props = {
  building: Building;
  options: Method[];
  selectedId: string | undefined;
  selected: Method | undefined;
  timeScale: number;
  actionError?: string;
  pending: boolean;
  onSelectMethod: (methodId: string) => void;
  onStart: () => void;
  onStop: () => void;
  onCollect: () => void;
};

export function BuildingCard({
  building: b,
  options,
  selectedId,
  selected,
  timeScale,
  actionError,
  pending,
  onSelectMethod,
  onStart,
  onStop,
  onCollect,
}: Props) {
  const job = b.queue[0];
  const progress = job ? Math.min(100, (job.elapsedGameSec / job.durationGameSec) * 100) : 0;
  const remain = realRemainSec(job, timeScale);

  return (
    <article className={`plot ${b.status}${pending ? " pending" : ""}`}>
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
            <select value={selectedId ?? ""} onChange={(e) => onSelectMethod(e.target.value)}>
              {options.map((m) => (
                <option key={m.id} value={m.id}>
                  {METHOD_NAME[m.id] ?? m.code} · {(m.durationGameSec / timeScale).toFixed(0)} 秒
                </option>
              ))}
            </select>
            <div className="recipe">
              {selected ? (
                <>
                  <div>消耗 {fmtIo(selected.inputs)}</div>
                  <div>產出 {fmtIo(selected.outputs)}</div>
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="recipe">倉不開工，只佔建築槽。</div>
        )}

        {actionError ? (
          <p className="plot-action-error" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="actions">
          <button type="button" disabled={!options.length || b.status !== "idle"} onClick={onStart}>
            開工
          </button>
          <button type="button" className="ghost" disabled={!canStopBuilding(b.status)} onClick={onStop}>
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
    </article>
  );
}
